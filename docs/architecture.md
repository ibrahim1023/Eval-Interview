# EvalInterview — Architecture

## 1. Overview

EvalInterview is a single Next.js application with four external dependencies:

```text
Next.js Application
       │
       ├── ElevenLabs      (voice interview)
       ├── Context.dev     (organizational knowledge retrieval)
       ├── LLM Provider    (extraction / classification / generation)
       └── Supabase Postgres (persistence)
```

Deliberately absent: microservices, queues, Kubernetes, a separate backend. All
orchestration lives in Next.js route handlers + `lib/` modules. The only other
deliverable is the standalone Python `eval-runner/` package.

The central design idea: the **behavior specification** is the intermediate
representation (IR) between human knowledge and executable evals.

```text
Expert voice interview ──┐
                         ├──> Behavior Specification (IR) ──> Executable Eval Suite
Context.dev knowledge ───┘                                   (YAML + graders + runner)
```

## 2. Component Responsibilities

### 2.1 `app/` — UI (four screens only)

| Screen | Route | Purpose |
| ------ | ----- | ------- |
| Landing | `/` | Positioning; three-part architecture visual |
| New Interview | `/interview/new` | Agent name, description, expert role, knowledge source → `Start Interview` |
| Interview | `/interview/[id]` | Voice conversation + live side panel (rules discovered, Context.dev findings, unresolved questions) |
| Results | `/interview/[id]/results` | Confirmed rules, scenarios, conflicts, unresolved areas, provenance, export |

The Interview screen is the primary screen. Context.dev activity must be **visibly
part of the product** (supported/conflict/uncovered indicators updating live).

### 2.2 `app/api/` — Route Handlers

Thin HTTP layer. Handlers validate input, call `lib/` modules, persist results, and
return JSON. No vendor SDK details here.

| Endpoint | Purpose |
| -------- | ------- |
| `POST /api/interviews` | Create interview (agent description, expert role, knowledge source) |
| `GET /api/interviews/[id]` | Session state for the Interview screen (polled or streamed) |
| `POST /api/interviews/[id]/turns` | Ingest a conversation turn (from ElevenLabs webhook/client tool) → run the interview loop → return next question + side-panel updates |
| `POST /api/interviews/[id]/rules/[ruleId]` | Confirm or edit a rule (Rule Review) |
| `POST /api/interviews/[id]/finish` | Move to review: freeze behavior spec, generate scenarios |
| `GET /api/interviews/[id]/export` | Produce ZIP of the executable eval suite |

### 2.3 `lib/interview/` — Interview Orchestrator

The heart of the product. A per-interview state machine that runs after each expert
turn:

```text
Expert statement
      ↓
[1] extractRule()          provisional rule(s) from the statement
      ↓
[2] Context.dev retrieval  evidence for the extracted concepts
      ↓
[3] classifyEvidence()     SUPPORTED | CONFLICT | PARTIAL | NO_EVIDENCE | NEW_RELATED_AREA
      ↓
[4] reconcile              update behavior model (rules, conflicts, gaps)
      ↓
[5] generateFollowUp()     one next question, derived from conversation + model + evidence
      ↓
[6] persist + emit         new rules/evidence/question → UI side panel
```

Elicitation strategies the orchestrator must be able to trigger (selected by the
LLM based on context, not a fixed script):

- **Probing vague statements** — "usually", "sometimes", "large" → ask for the
  exception/threshold/decision-changer.
- **Conflict resolution** — when evidence classification is `CONFLICT` or `PARTIAL`,
  quote the source and ask the expert to resolve. Never decide silently.
- **Coverage-gap discovery** — when retrieval surfaces `NEW_RELATED_AREA` topics not
  yet discussed, ask about them.
- **Contrastive elicitation** — generate scenario pairs (Case A / Case B) differing
  in one factor; ask which gets approved and *what distinction changed the outcome*.
- **Boundary discovery** — when a threshold is named, probe around it
  ($9,999 / $10,000 / $10,001). Boundaries directly generate eval cases.

Interview state (in Postgres, hydrated per turn):

```text
interview config + transcript
current rules (provisional / confirmed / conflict / unresolved)
retrieved evidence + classifications
coverage map: discussed topics vs. discovered topics
open questions queue
```

### 2.4 `lib/elevenlabs/` — Voice Client

- Creates and manages the ElevenLabs agent conversation for an interview.
- Delivers structured session context to the interviewer agent: agent description,
  expert role, existing rules, retrieved evidence, unresolved conflicts, coverage
  gaps, previous answers.
- Feeds transcript turns back into `POST .../turns`.
- Phase 1 uses a text-input shim against the same orchestrator interface; Phase 2
  swaps in the real voice path without changing the orchestrator.

### 2.5 `lib/context/` — Context.dev Client

- Registers/uses the knowledge source for the interview (docs URL, GitHub repo,
  docs site, uploaded text — whatever Context.dev reliably supports; **no custom
  connector ecosystem**).
- `retrieve(query)` → evidence chunks with source references.
- Used in two places: the per-turn retrieval loop, and a periodic coverage scan
  that surfaces undiscussed topic areas.

### 2.6 `lib/intelligence/` — IntelligenceProvider

Single seam for all LLM work. One provider, no multi-model routing.

```typescript
interface IntelligenceProvider {
  extractRule(input: RuleExtractionInput): Promise<ProvisionalRule[]>
  classifyEvidence(input: EvidenceClassificationInput): Promise<EvidenceClassification>
  generateFollowUp(input: FollowUpInput): Promise<FollowUpQuestion>
  generateScenarios(input: ScenarioGenerationInput): Promise<Scenario[]>
  generateRubric(input: RubricGenerationInput): Promise<Rubric>
}
```

All calls use structured output (JSON schema / tool calling) with Zod validation at
the boundary. Prompts are versioned files in `lib/intelligence/prompts/`, not inline
strings scattered through handlers.

### 2.7 `lib/rules/` — Behavior Model & Review

- Merges provisional rules with evidence into the behavior specification.
- Tracks rule lifecycle: `provisional → confirmed | conflict | unresolved`.
- Supports the review screen: edit + confirm, counts of unresolved questions /
  conflicts / confirmed rules. Simple editing only — no policy editor.

### 2.8 `lib/evals/` — Scenario Generation & Export

- Generates 10–20 scenarios per interview across four types: `normal`,
  `contrastive`, `boundary`, `adversarial`. Quality over volume.
- Every scenario links back to the rules it covers (`covers: [...]`) and carries
  provenance (interview turns + context sources).
- Two grader types only: `deterministic` (structured action equality) and `rubric`
  (criteria list, LLM-judged at run time).
- `export(interviewId)` → ZIP with the layout below. The output must be usable
  entirely outside EvalInterview.

```text
generated-evals/
├── behavior/specification.yaml
├── evals/{normal,contrastive,boundary,adversarial}.yaml
├── graders/graders.py
├── sources/provenance.json
├── eval_config.yaml
└── README.md
```

### 2.9 `eval-runner/` — Python CLI

Intentionally small, PyYAML + minimal deps:

```bash
evalinterview run ./generated-evals
```

Loads scenario YAMLs, invokes the user-configured agent under test (an HTTP
endpoint or command specified in `eval_config.yaml`), applies deterministic or
rubric graders, prints per-eval results with rule references, and exits non-zero on
failure. See `docs/integrations.md` §5.

## 3. Data Flow (End to End)

```text
Create EvalInterview
      ↓
Describe agent (name, description, expert role)
      ↓
Connect knowledge source (Context.dev)
      ↓
Start voice interview (ElevenLabs)
      ↓
┌─────────────── per-turn loop ───────────────┐
│ Expert answers                              │
│   → extract provisional rule                │
│   → Context.dev retrieves evidence          │
│   → classify: support / conflict / gap      │
│   → generate adaptive follow-up             │
└─────────────────────────────────────────────┘
      ↓ (repeat until expert ends or coverage sufficient)
Review behavior specification (edit / confirm)
      ↓
Generate eval scenarios (normal / contrastive / boundary / adversarial)
      ↓
Generate graders
      ↓
Export executable eval suite (ZIP)
```

## 4. Key Architectural Decisions

### ADR-1: Single Next.js app, no separate backend

Rationale: the spec mandates minimal infrastructure. Route handlers + Postgres are
sufficient for session state, orchestration, and export. ElevenLabs webhooks can be
received as route handlers; nothing requires a queue at MVP scale.

### ADR-2: Orchestrator owns the loop, voice is a transport

The interview loop (extract → retrieve → classify → follow-up) lives server-side in
`lib/interview/`, independent of ElevenLabs. ElevenLabs is a transport + TTS/STT
layer. This keeps the core testable with text input (Phase 1) and avoids locking
product logic into a voice vendor's agent config.

### ADR-3: Behavior specification as the IR

Rules are not generated straight into evals. The confirmed behavior specification
(with provenance) is the intermediate artifact, reviewed by a human before scenario
generation. This is what separates the product from a synthetic test generator.

### ADR-4: LLM behind `IntelligenceProvider`, structured output everywhere

One provider, five methods, Zod-validated structured outputs. This keeps prompts
auditable, enables provider swaps, and prevents route handlers from accumulating
prompt spaghetti. No multi-model routing.

### ADR-5: Portable YAML as the export contract

Behavior spec, scenarios, and provenance export as plain YAML/JSON so the suite
runs outside the product. The Python runner depends only on these files, never on
the app's database. Formats are versioned (`spec_version` field) from day one.

### ADR-6: Postgres for all state, no queue

Interview state is small (transcript + dozens of rules/evidence rows). Synchronous
per-turn processing in a route handler is acceptable; if a Context.dev or LLM call
is slow, the client shows progressive side-panel updates from persisted state.

## 5. Failure & Edge Handling

- **No evidence found** (`NO_EVIDENCE`): rule stays provisional; interviewer probes
  deeper or records the gap. Absence of evidence is itself surfaced in the UI.
- **Org has no clear answer**: record `UNRESOLVED`; exclude from graded scenarios
  but include in the spec and results screen. Never fabricate ground truth.
- **Vendor outage (ElevenLabs / Context.dev / LLM)**: fail the turn gracefully,
  preserve transcript state, allow resume. Interview state is persisted after every
  turn so a session can be resumed.
- **Slow retrieval**: the side panel renders persisted state; the follow-up
  question waits on the loop but prior findings display immediately.

## 6. Security & Configuration

- All vendor keys server-side only (`lib/` clients). No `NEXT_PUBLIC_` secrets.
- Knowledge sources may contain sensitive org data — log source references, not
  raw retrieved content, by default.
- `.env.example` documents every required variable; the app fails fast at boot if
  required vars are missing.

## 7. Testing Strategy

- **Unit**: rule extraction/reconciliation logic, evidence classification parsing,
  YAML serialization, grader implementations — with fixture transcripts/evidence
  (fixtures allowed in tests only).
- **Contract**: golden-file tests for the behavior-spec and scenario YAML exporters
  — these are public contracts.
- **Integration**: scripted text-mode interview (Phase 1 shim) driving the full
  loop against mocked vendor boundaries, asserting side-panel state transitions.
- **E2E smoke**: run an exported example suite with `evalinterview run` in CI.
