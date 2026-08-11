# EvalInterview — Implementation Roadmap & Strategy

## Status

| Phase | State |
| ----- | ----- |
| Phase 0 — Scaffold & API verification | Complete |
| Phase 1 — Core vertical slice (text input) | Complete (live-API smoke test 2026-08-10) |
| Phase 2 — ElevenLabs voice | In progress: voice session + UI shipped; manual demo pending |
| Phase 3 — Review, scenario generation, export, Python runner | Not started |
| Phase 4 — UI polish | Not started |
| Phase 5 — Examples, README, launch | Not started |

`task.md` tracks only the current phase. Git history is the authoritative
record of completed implementation detail.

## Strategy in one paragraph

Build the **core loop first, with text input** — the differentiating value is the
adaptive elicitation loop (expert judgment × retrieved knowledge → conflicts/gaps →
behavior spec → executable evals), not the voice. Voice, polish, and launch assets
layer on top of a working loop. Every phase ends in something runnable, so scope
can be cut at any phase boundary and the project still demos. Ship the core idea
well, market it, fix obvious issues, move on — do not grow this into an enterprise
eval platform.

## Guiding principles (from the spec)

- Domain-agnostic engine; domains exist only as example data.
- Real integrations (ElevenLabs, Context.dev, LLM) in the production path.
- Provenance everywhere; never fabricate ground truth; never silently resolve
  conflicts.
- Minimal infra: Next.js + Postgres. No queues, no microservices.
- Quality over volume: 10–20 good scenarios per interview.
- Explicit non-goals list (auth, teams, RBAC, billing, connectors, etc.) is
  binding. See `AGENTS.md`.

---

## Phase 1 — Core Vertical Slice (text input)

**Goal:** the full elicitation loop works end to end with typed input instead of
voice. No polish.

**Build:**

1. Repo scaffold: Next.js + TS + Tailwind + shadcn/ui, Supabase Postgres, env
   config with fail-fast validation, `.env.example`.
2. DB schema + migrations (`interviews`, `messages`, `rules`, `evidence`,
   `scenarios`) per `docs/data-model.md`.
3. `ContextClient` (`lib/context/`) — register source, retrieve, scan topics.
   Context.dev is an ingestion API only (scrape → Markdown), so retrieval is
   local: Postgres full-text search over the `source_chunks` table.
4. `IntelligenceProvider` (`lib/intelligence/`) — `extractRule`,
   `classifyEvidence`, `generateFollowUp` with structured output + Zod.
5. Interview orchestrator (`lib/interview/`) — per-turn loop:
   extract → retrieve → classify → reconcile → follow-up.
6. Minimal screens: New Interview, Interview (text box instead of voice) with the
   live side panel (rules discovered / supported / conflict / uncovered areas).
7. Rule Review screen — **moved to Phase 3**; the Phase 1 Results screen is
   read-only.

**Exit criteria (runnable demo):** type expert answers in → provisional rules
extracted → Context.dev evidence retrieved and classified → conflicts and gaps
surfaced → adaptive follow-up questions reflect the evidence.

**Primary risk:** the adaptive loop feels questionnaire-like. Mitigate early with
prompt iteration against 2–3 fixture transcripts (support lead, senior engineer).

## Phase 2 — ElevenLabs (voice)

**Goal:** replace the text box with the real voice interview. The full interaction
works conversationally.

**Build:**

1. ~~`VoiceSessionClient` (`lib/elevenlabs/`)~~ — done as a thin voice client:
   `POST /api/interviews/[id]/voice/start` returns a signed URL; a shared
   ElevenLabs agent calls `POST .../turns` via a webhook tool after each expert
   turn. All reasoning stays server-side in the orchestrator.
2. ~~Server-side interviewer system-prompt assembly~~ — done as a static agent
   prompt (`lib/elevenlabs/agent-config.ts`); per-turn context flows through the
   orchestrator's generated questions instead of mid-session context updates.
3. ~~Interview screen voice UI~~ — done: `@elevenlabs/react`
   (`ConversationProvider`/`useConversation`), listening/speaking indicators,
   side panel keeps polling.
4. ~~Session resume from persisted state on disconnect~~ — done: unexpected
   disconnects auto-reconnect with a fresh signed URL and the same
   `interview_id` dynamic variable (capped attempts); the orchestrator resumes
   from persisted Postgres state.

**Exit criteria:** a real voice conversation drives the identical loop proven in
Phase 1; Context.dev findings visibly change the next spoken question.

**Primary risk:** context-refresh latency/limitations in the ElevenLabs agent.
Mitigate with compact context summaries and refresh-per-turn (not mid-turn).

## Phase 3 — Eval Export

**Goal:** the behavior spec compiles into a real, runnable artifact outside the
app.

**Build:**

1. `generateScenarios` + `generateRubric` (`IntelligenceProvider`).
2. Exporters (`lib/evals/`): `behavior/specification.yaml`, four `evals/*.yaml`
   files, `graders/graders.py`, `sources/provenance.json`, `eval_config.yaml`,
   README — ZIP download from the Results screen.
3. Python `eval-runner/` package: `evalinterview run ./generated-evals` with
   deterministic + rubric graders and clear pass/fail output.
4. Golden-file tests for all exported formats; CI smoke test running an exported
   example suite.

**Exit criteria:** export a suite from a real interview, run it with the CLI
against a stub agent, get meaningful pass/fail output with rule references.

## Phase 4 — UI Polish

**Goal:** the four screens are launch-quality.

- Landing: headline "Turn expert judgment into executable AI evals" + three-part
  architecture visual.
- New Interview, Interview, Results polished; Context.dev activity (supported /
  conflict / uncovered) is visually prominent on the Interview screen.

**Explicitly not polished:** anything outside the four screens.

## Phase 5 — Examples, README, Launch

**Build:**

1. Three example interview/output datasets (no separate implementations):
   - `examples/code-review-agent/` — primary demo (migrations, tests,
     authorization, breaking changes, secrets, dependency changes)
   - `examples/support-agent/` — refunds, verification, escalation, exceptions,
     fraud signals
   - `examples/research-agent/` — citation quality, source independence,
     uncertainty, conflicting evidence
2. README per spec §38: positioning paragraph → one conversation → one extracted
   rule → one generated eval → architecture diagram. Short.
3. Demo video using the Code Review Agent (the migration/backup conflict moment).
4. License (MIT or Apache-2.0), screenshots, architecture diagram.
5. GitHub launch prep: issues enabled, starter contribution issues (Promptfoo /
   Braintrust / OpenAI Evals / LangSmith exporters, additional scenario generators,
   CLI interview mode, multi-expert disagreement detection, additional Context.dev
   source adapters) labeled `good first issue` / `help wanted`.

**Then stop.** Execute the X launch strategy (spec §40–41): sell the problem
("who decided what correct behavior was?"), show the conflict-resolution moment,
attach the video.

---

## Milestone Map

| Milestone | Phases | Demo-able artifact |
| --------- | ------ | ------------------ |
| M1: Loop works | 1 | Text interview → confirmed rules with evidence |
| M2: Voice works | 2 | Real voice interview with adaptive questions |
| M3: Evals run | 3 | Exported suite passes/fails via CLI |
| M4: Launch quality | 4–5 | Polished demo + README + examples + video |

## Acceptance Criteria Traceability (spec §37)

| # | Criterion | Verified by |
| - | --------- | ----------- |
| 1 | Define any AI agent | New Interview screen (Phase 1) |
| 2 | Real knowledge source via Context.dev | `ContextClient.registerSource` (Phase 1) |
| 3 | Real ElevenLabs voice interview | Phase 2 exit criteria |
| 4 | Interviewer adapts to previous answers | Orchestrator loop + transcript-conditioned follow-ups |
| 5 | Answers → provisional rules | `extractRule` (Phase 1) |
| 6 | Evidence retrieval for rules | Per-turn retrieval loop (Phase 1) |
| 7 | Detect support / conflict / uncovered areas | `classifyEvidence` + coverage scan |
| 8 | Context findings influence questions | `generateFollowUp` input contract + demo |
| 9 | Expert can confirm/edit rules | Rule Review screen (Phase 3) |
| 10 | Provenance preserved | `interview_sources`/`context_sources` → export (Phases 1, 3) |
| 11 | ≥10 useful scenarios | `generateScenarios` targetCount (Phase 3) |
| 12 | Multiple scenario types | normal/contrastive/boundary/adversarial files |
| 13 | Executable suite export | ZIP exporter (Phase 3) |
| 14 | Runner works outside the app | CLI + CI smoke test (Phase 3) |
| 15 | Three example domains | Phase 5 |
| 16 | README/demo self-explanatory | Phase 5 |

## Risk Register (cross-phase)

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Adaptive questioning feels scripted | Core value fails | Text-first development enables fast prompt iteration; fixture transcripts for regression |
| Context.dev source support is narrower than hoped | Knowledge step weakens | Start with whatever source type is most reliable (docs URL or repo); the engine treats sources uniformly |
| LLM extraction quality inconsistent | Rules noisy | Structured output + Zod + confirmation gate in review; rules stay provisional until reconciled |
| Voice latency kills conversational feel | Demo suffers | Compact interviewer context; speak follow-up only when loop completes; show side-panel activity meanwhile |
| Scope creep into enterprise features | Never ships | Non-goals list is binding; exporters/integrations are delegated to open-source contribution issues |

## Deferred Work & Known Follow-ups

- **Near-duplicate rule merging** (Phase 1): rules extracted across turns are
  not deduped. Resolve in the Phase 3 review screen or with a cheap
  similarity check.
- **Remove `docs/api-notes.md` before launch** (Phase 5): it is a temporary
  Phase 0 findings document.
- **Review/export routes** (`POST .../rules/[ruleId]`, `GET .../export`) and
  the full review screen land in Phase 3; the Interview screen's finish button
  already moves interviews to `review` status.

## Post-Launch

Per spec §42: publish repo + demo, execute X strategy, collect feedback, fix
worthwhile bugs, accept useful contributions, move to the next project. Do not
expand the project unless real adoption provides a reason to.
