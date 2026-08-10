# EvalInterview — Integration Contracts

All vendor access goes through `lib/` clients. Route handlers and components never
import vendor SDKs directly. All integrations are real in the production path —
fixtures/mocks only in tests.

```bash
DATABASE_URL=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
CONTEXT_API_BASE_URL=https://api.context.dev/v1
CONTEXT_API_KEY=
HYPERFUSION_API_KEY=
HYPERFUSION_BASE_URL=https://api.hyperfusion.io/v1
ELEVENLABS_WEBHOOK_SECRET=
```

---

## 1. ElevenLabs (voice interface)

**Role:** thin voice transport between the human expert and the interview
orchestrator. Owns STT/TTS and conversational turn-taking; does **not** own
interview logic or dynamic context. This design keeps ElevenLabs credit usage
low: the system prompt is static and minimal, and the only tool call per turn is
`submit_expert_turn`.

### Agent configuration

```typescript
// lib/elevenlabs/agent-config.ts
buildAgentConfig(input: {
  interviewId: string
  baseUrl: string
  webhookSecret?: string
})
```

The agent config contains:
- **System prompt:** static and minimal. The agent is instructed to always call
  `submit_expert_turn` after the expert speaks and to speak exactly the question
  returned by the tool.
- **First message:** brief intro that sets the interview goal.
- **Webhook tool:** `submit_expert_turn` POSTs the expert's exact answer to
  `POST /api/interviews/[id]/turns` and returns the next question.

### Interface

```typescript
// lib/elevenlabs/client.ts
interface VoiceSessionClient {
  startSession(input: {
    interviewId: string
    baseUrl: string
    webhookSecret?: string
  }): Promise<{ conversationId: string; clientToken: string }>

  sendInterviewerTurn(input: {
    conversationId: string
    question: string
  }): Promise<void>
}
```

### Design notes

- The orchestrator runs server-side and returns the next question via the
  `submit_expert_turn` tool response. The ElevenLabs agent simply speaks it.
- No mid-conversation context updates are pushed to ElevenLabs; the behavior
  model, evidence, and gaps live in Postgres and are used only by the
  orchestrator's LLM calls.
- Phase 1 develops against a text shim implementing the same caller contract;
  Phase 2 swaps in the real voice path with zero orchestrator changes.
- Graceful degradation: if the voice session drops, the interview resumes from
  persisted state; nothing is lost between turns.

## 2. Context.dev (organizational knowledge)

**Role:** ingestion of the org's docs/policies into clean Markdown. Verified in
Phase 0: Context.dev is a scraping API, **not** a retrieval API — so we crawl
once per interview and retrieve locally from Postgres.

### Verified endpoints (Phase 0)

| Endpoint | Cost | Purpose |
| -------- | ---- | ------- |
| `GET /web/scrape/markdown?url=...` | 1 credit/page | Page → clean Markdown |
| `GET /web/scrape/sitemap?domain=...&search=...` | 1–2 credits | URL discovery, optional relevance filter |
| `POST /web/search` `{ query, numResults }` | 1 credit/10 results | Web search fallback |

Auth: `Authorization: Bearer $CONTEXT_API_KEY`.

### Interface

```typescript
// lib/context/client.ts
interface ContextClient {
  registerSource(input: {
    interviewId: string
    source: { type: "docs_url"; url: string }
  }): Promise<{ pageCount: number }>
  // sitemap discover → scrape markdown per page → store in source_chunks

  retrieve(input: {
    interviewId: string
    query: string
    limit?: number          // default 6
  }): Promise<EvidenceChunk[]>
  // Postgres full-text search over source_chunks

  scanTopics(input: {
    interviewId: string
  }): Promise<TopicArea[]>  // sitemap URLs vs. topics covered so far
}

type EvidenceChunk = {
  source: string        // page URL, e.g. "https://handbook.example.com/migrations"
  title: string
  content: string
  score: number
}
```

### Where it's used

1. **Per-turn retrieval loop** — after `extractRule()`, query the local chunk
   store; results feed `classifyEvidence()`.
2. **Coverage scan** — `scanTopics()` compares sitemap-derived topic areas with
   topics already discussed → `NEW_RELATED_AREA` evidence rows (`ruleId = null`).

### Query strategy

- Query from the provisional rule's `condition` + `expectedBehavior`, not the raw
  transcript sentence (cleaner retrieval signal).
- Cap chunks per turn (suggested 5–8) to keep the classifier prompt focused.
- Persist every retrieved chunk as an `Evidence` row with its classification —
  provenance requires the record, and the UI renders Context.dev activity live.
- Crawl once at interview creation; do not re-scrape per turn (credit-efficient).

## 3. LLM Provider (`IntelligenceProvider`)

**Role:** all reasoning. One provider; no multi-model routing. Every method takes
typed input and returns Zod-validated structured output.

**Verified in Phase 0:** Hyperfusion (`https://api.hyperfusion.io/v1`), model
`openai/gpt-oss-120b`, OpenAI-compatible chat completions with
`response_format: { type: "json_object" }`. It is a reasoning model — responses
carry `reasoning_content` that consumes `max_tokens`; use generous token limits
(≥ 2048).

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
| ElevenLabs credit usage per turn | Thin voice transport with static system prompt; all reasoning happens server-side in the orchestrator |
| Context.dev retrieval latency per turn | Cap chunks; show persisted side-panel state immediately; ask follow-up only after loop completes |
| LLM structured-output drift | Zod validation + one retry + prompt versioning; golden tests on extraction fixtures |
| Voice transcript errors corrupting rules | Rules stay `provisional` until evidence reconciliation + expert confirmation; review screen is the final gate |
