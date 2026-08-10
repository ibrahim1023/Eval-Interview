# EvalInterview — Integration Contracts

All vendor access goes through `lib/` clients. Route handlers and components never
import vendor SDKs directly. All integrations are real in the production path —
fixtures/mocks only in tests.

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
CONTEXT_API_KEY=
LLM_API_KEY=
DATABASE_URL=
```

---

## 1. ElevenLabs (voice interface)

**Role:** transport between the human expert and the interview orchestrator.
Owns STT/TTS and conversational turn-taking; does **not** own interview logic.

### Interface

```typescript
// lib/elevenlabs/index.ts
interface VoiceSessionClient {
  startSession(input: {
    interviewId: string
    interviewerContext: InterviewerContext
  }): Promise<{ conversationId: string; clientToken: string }>

  updateContext(input: {
    conversationId: string
    interviewerContext: InterviewerContext
  }): Promise<void>

  sendInterviewerTurn(input: {
    conversationId: string
    question: string
  }): Promise<void>
}

type InterviewerContext = {
  agentName: string
  agentDescription: string
  expertRole: string
  existingRules: RuleSummary[]
  retrievedEvidence: EvidenceSummary[]
  unresolvedConflicts: ConflictSummary[]
  coverageGaps: string[]
  transcriptTail: Message[]       // recent turns for continuity
}
```

### Design notes

- The ElevenLabs agent's system prompt is assembled server-side from
  `InterviewerContext` and refreshed after every loop iteration via
  `updateContext` — this is how Context.dev findings "influence subsequent
  questions."
- Transcript turns arrive via webhook or client-side callback and are posted to
  `POST /api/interviews/[id]/turns`, which runs the orchestrator loop and returns
  the next question to speak.
- **Interview style requirements** (baked into the system prompt): conversational,
  one question at a time, no fixed question list, probe hedges ("usually",
  "large"), never silently resolve conflicts.
- Phase 1 develops against a text shim implementing the same caller contract;
  Phase 2 swaps in the real voice path with zero orchestrator changes.
- Graceful degradation: if the voice session drops, the interview resumes from
  persisted state; nothing is lost between turns.

## 2. Context.dev (organizational knowledge)

**Role:** retrieval over the org's docs/repos/policies. Required part of the
primary workflow, not an add-on. Use Context.dev's existing source capabilities
(docs URL, GitHub repo, docs site, uploaded text) — do not build connectors.

### Interface

```typescript
// lib/context/index.ts
interface ContextClient {
  registerSource(input: {
    interviewId: string
    source: KnowledgeSource          // docs URL | GitHub repo | docs site | text upload
  }): Promise<{ sourceId: string }>

  retrieve(input: {
    sourceId: string
    query: string
    limit?: number
  }): Promise<EvidenceChunk[]>

  scanTopics(input: {
    sourceId: string
  }): Promise<TopicArea[]>           // for coverage-gap discovery
}

type EvidenceChunk = {
  source: string        // e.g. "engineering-handbook/migrations"
  content: string
  score: number
}
```

### Where it's used

1. **Per-turn retrieval loop** — after `extractRule()`, query with the extracted
   concepts; results feed `classifyEvidence()`.
2. **Coverage scan** — `scanTopics()` vs. topics already discussed →
   `NEW_RELATED_AREA` evidence rows (`ruleId = null`) → gap questions.

### Query strategy

- Query from the provisional rule's `condition` + `expectedBehavior`, not the raw
  transcript sentence (cleaner retrieval signal).
- Cap chunks per turn (suggested 5–8) to keep the classifier prompt focused.
- Persist every retrieved chunk as an `Evidence` row with its classification —
  provenance requires the record, and the UI renders Context.dev activity live.

## 3. LLM Provider (`IntelligenceProvider`)

**Role:** all reasoning. One provider; no multi-model routing. Every method takes
typed input and returns Zod-validated structured output.

```typescript
// lib/intelligence/provider.ts
interface IntelligenceProvider {
  extractRule(input: {
    agentDescription: string
    turn: Message
    recentTranscript: Message[]
  }): Promise<{ rules: ProvisionalRule[] }>
  // ProvisionalRule: { condition, expectedBehavior, exceptions[], sourceTurn }

  classifyEvidence(input: {
    rule: ProvisionalRule
    evidence: EvidenceChunk[]
  }): Promise<{
    classification: "SUPPORTED" | "CONFLICT" | "PARTIAL" | "NO_EVIDENCE" | "NEW_RELATED_AREA"
    rationale: string
    relevantChunks: string[]
  }>

  generateFollowUp(input: {
    transcript: Message[]
    behaviorModel: RuleSummary[]
    evidenceClassifications: EvidenceClassification[]
    coverageGaps: string[]
    strategyHint?: "probe" | "conflict" | "gap" | "contrastive" | "boundary"
  }): Promise<{ question: string; rationale: string }>

  generateScenarios(input: {
    confirmedRules: Rule[]
    boundaries: Boundary[]
    targetCount: number           // 10–20 total across types
  }): Promise<{ scenarios: GeneratedScenario[] }>
  // Each scenario tagged normal | contrastive | boundary | adversarial,
  // with covers[] rule ids and expected action.

  generateRubric(input: {
    rule: Rule
    scenario: GeneratedScenario
  }): Promise<{ criteria: string[] }>
}
```

### Rules for implementation

- Structured output only (JSON schema / tool calling); validate with Zod at the
  module boundary and retry once on parse failure before surfacing an error.
- Prompts live in `lib/intelligence/prompts/` as versioned modules
  (`extractRule.v1.ts`, …) with colocated few-shot examples drawn from the spec
  (migration/rollback, refund thresholds, citation quality).
- Temperature low (≤0.3) for extraction/classification; moderate (≤0.7) for
  scenario generation diversity.
- Never let the model assign `UNRESOLVED` silently — unresolved comes from the
  expert or from explicit conflict non-resolution, not model uncertainty.

## 4. Supabase Postgres

- Plain Postgres access via `DATABASE_URL`; schema per `docs/data-model.md`.
- No Supabase Auth at MVP (authentication is a non-goal); the DB is effectively
  single-tenant per deployment.
- Migrations in `supabase/migrations/` (or a `db/migrations/` folder), applied in
  CI/setup scripts.

## 5. Eval Runner (Python, `eval-runner/`)

**Role:** execute exported suites outside the app. Minimal deps (PyYAML + an HTTP
client). Package name `evalinterview`.

```bash
evalinterview run ./generated-evals
```

### Behavior

1. Load `eval_config.yaml` → locate target agent (`http` endpoint or `command`).
2. Load all `evals/*.yaml` → run each scenario against the target.
3. Grade: `deterministic` in-process; `rubric` via configured model.
4. Print results with rule references; exit non-zero if any eval fails.

```text
Code Review Agent

14 / 16 passed

FAIL EVAL-007
Scenario:  Destructive migration without verified backup
Expected:  block
Actual:    approve
Rule:      migration_safety
```

### Runner ↔ app boundary

The runner depends only on the exported directory. It must never import the app,
read its database, or require its env vars (except the user-supplied model key for
rubric grading, documented in the exported README).

## 6. Integration Risk Notes

| Risk | Mitigation |
| ---- | ---------- |
| ElevenLabs agent context updates are lossy mid-conversation | Keep context compact (summaries, not full transcripts); refresh after each loop, not mid-turn |
| Context.dev retrieval latency per turn | Cap chunks; show persisted side-panel state immediately; ask follow-up only after loop completes |
| LLM structured-output drift | Zod validation + one retry + prompt versioning; golden tests on extraction fixtures |
| Voice transcript errors corrupting rules | Rules stay `provisional` until evidence reconciliation + expert confirmation; review screen is the final gate |
