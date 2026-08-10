# EvalInterview Implementation Task List

This file tracks the complete build of EvalInterview from scaffold to launch-ready MVP.
Tick checkboxes as tasks are completed and committed in small logical chunks.

## Conventions

- Each phase is a milestone. Commit at the end of every sub-section (or more often).
- Add/update unit tests for any new `lib/` module before moving to the next module.
- Update this file in the same commit that completes the task(s) it ticks.
- Refer to the implementation plan at `/Users/ibrahim/.devin/plans/plan-cdc0d69fa735662f.md` for full architecture detail.

---

## Phase 0 — Scaffold & Verify APIs

Goal: repo runs, DB connects, external APIs are reachable, concrete integration shapes are documented before product logic is built.

### 0.1 Project scaffold

- [x] Initialize Next.js 15 project with App Router, TypeScript, Tailwind CSS, ESLint, no `src/` directory.
- [x] Install runtime/infra dependencies: `drizzle-orm`, `postgres`, `zod`, `jszip` (or Node built-ins for ZIP).
- [x] Install dev dependencies: `drizzle-kit`, `@types/node`, TypeScript config.
- [x] Install shadcn/ui base and confirm `components.json` + `lib/utils.ts` exist.
- [x] Create `.env.example` with all required and optional variables.
- [x] Create a `.gitignore` that excludes `.env*`, `node_modules`, `.next`, `out`, `dist`, `eval-runner/.venv`, Python cache, `.DS_Store`.
- [x] Create `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `db:generate`, `db:migrate`, `db:studio`, `db:push`.
- [x] Create `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`.

### 0.2 Drizzle + Supabase setup

- [x] Add `DATABASE_URL` to `.env.example`.
- [x] Create `drizzle.config.ts` reading `DATABASE_URL`.
- [x] Create `lib/db/index.ts` — singleton `postgres` client and Drizzle instance.
- [x] Create `lib/db/schema.ts` with tables: `interviews`, `messages`, `rules`, `evidence`, `scenarios` (match `docs/data-model.md`).
- [x] Run `drizzle-kit generate` to produce `drizzle/0000_initial.sql`.
- [ ] Run `drizzle-kit migrate` (or `db:push` against dev DB) to apply schema. *(blocked on `DATABASE_URL`)*
- [ ] Write a tiny integration test (`scripts/check-db.ts`) that inserts + reads one row from each table, then delete the script before the phase commit. *(blocked on `DATABASE_URL`)*

### 0.3 Python eval-runner skeleton

- [x] Create `eval-runner/pyproject.toml` with package metadata and deps: `pyyaml`, `requests`, `click`.
- [x] Create `eval-runner/evalinterview/__init__.py`, `cli.py`, `loader.py`, `runner.py`, `graders.py`.
- [x] Add `evalinterview run --help` smoke test to CI or a local script.
- [x] Add `.gitignore` / venv instructions in `eval-runner/README.md`.

### 0.4 External API verification (temporary scripts, delete before phase commit)

- [x] Create `scripts/verify-hyperfusion.ts` to call the chat/completions endpoint with the user's API key and confirm:
  - base URL,
  - model names supported,
  - whether `response_format: { type: "json_object" }` works,
  - whether function/tool calling is supported.
- [x] Create `scripts/verify-contextdev.ts` to call source registration / retrieval endpoints with the user's base URL + API key and document the response shape.
- [x] Create `scripts/verify-elevenlabs.ts` to create/list a Conversational AI agent and understand how transcript/callback events are delivered.
- [x] Write findings into a temporary `docs/api-notes.md` (can be removed before launch).

### 0.5 Phase 0 commit

- [x] Run `npm run lint` and `npx tsc --noEmit` and fix errors.
- [ ] Commit: "chore: scaffold Next.js, Drizzle, and eval-runner skeleton".

---

## Phase 1 — Core Vertical Slice (Text Input)

Goal: the full adaptive elicitation loop works end to end with a text box. No voice yet.

### 1.1 Intelligence provider

- [ ] Create `lib/intelligence/provider.ts` with the five-method interface.
- [ ] Create `lib/intelligence/hyperfusion.ts` implementing the interface.
  - [ ] Build a shared fetch wrapper for Hyperfusion (OpenAI-compatible).
  - [ ] Implement `callStructured<T>(prompt, zodSchema)` with JSON-mode and one retry.
  - [ ] Add `IntelligenceError` class for parse/failures.
- [ ] Create `lib/intelligence/prompts/extractRule.ts` with few-shot examples.
- [ ] Create `lib/intelligence/prompts/classifyEvidence.ts` with few-shot examples.
- [ ] Create `lib/intelligence/prompts/generateFollowUp.ts` with probing/conflict/gap/contrastive/boundary strategies.
- [ ] Unit tests for `extractRule`, `classifyEvidence`, `generateFollowUp` using mocked fetch + fixture transcripts.

### 1.2 Context.dev client

- [ ] Create `lib/context/client.ts` with `registerSource`, `retrieve`, `scanTopics`.
- [ ] Read `CONTEXT_API_BASE_URL` and `CONTEXT_API_KEY` from env.
- [ ] Implement `retrieve(query)` returning `EvidenceChunk[]` mapped from actual Context.dev response.
- [ ] Implement fallback `scanTopics` if no native endpoint exists (retrieve against generated topic queries).
- [ ] Unit tests for `ContextClient` with a mocked server or fetch mock.

### 1.3 Rule repository & model helpers

- [ ] Create `lib/rules/repository.ts` — DB CRUD for rules and evidence using Drizzle.
- [ ] Create `lib/rules/model.ts` — pure functions for rule lifecycle transitions (provisional → confirmed/conflict/unresolved).
- [ ] Unit tests for lifecycle helpers and repository operations (use an isolated test DB or mocked Drizzle queries).

### 1.4 Interview orchestrator

- [ ] Create `lib/interview/orchestrator.ts` implementing `processTurn(interviewId, expertMessage)`.
  - [ ] Persist expert message with monotonic `turnIndex`.
  - [ ] Call `extractRule` with recent transcript.
  - [ ] For each extracted rule, call `context.retrieve`.
  - [ ] Call `classifyEvidence` and reconcile rules + evidence.
  - [ ] Periodically run `context.scanTopics` and insert `new_area` evidence rows.
  - [ ] Call `generateFollowUp` with full context.
  - [ ] Persist interviewer message.
  - [ ] Return `{ question, snapshot }`.
- [ ] Add error handling: on failure, persist a graceful fallback message.
- [ ] Unit/integration test for the full loop with mocked intelligence and context clients and a fixture transcript.

### 1.5 API routes

- [ ] `POST /api/interviews` — create interview and register Context.dev source.
- [ ] `GET /api/interviews/[id]` — return interview + messages + rules + evidence + scenarios.
- [ ] `POST /api/interviews/[id]/turns` — run orchestrator and return next question + snapshot.
- [ ] `POST /api/interviews/[id]/finish` — move status to `review`.
- [ ] Add Zod validation for every route body.
- [ ] Route-level tests with `next-test-api-route-handler` or a custom handler test harness.

### 1.6 Minimal UI screens

- [ ] Create `app/layout.tsx` with global providers and layout.
- [ ] Create `app/page.tsx` landing page with headline and CTA.
- [ ] Create `app/interview/new/page.tsx` form: agent name, description, expert role, knowledge source.
- [ ] Create `app/interview/[id]/page.tsx`:
  - [ ] Text input box for expert answers.
  - [ ] Live transcript display.
  - [ ] Side panel: rules discovered, Context.dev findings counts, finish button.
- [ ] Build small reusable components: `Transcript`, `RuleList`, `EvidenceBadge`, `ContextStatus`.
- [ ] Client polls `GET /api/interviews/[id]` every 2 seconds during active interview.

### 1.7 Phase 1 commit(s)

- [ ] End-of-sub-section commits for each major module (intelligence, context, rules, orchestrator, routes, UI).
- [ ] Final Phase 1 commit message: "feat: core vertical slice with text input".
- [ ] Manual demo: create interview, type answers, see rules + evidence + adaptive question.

---

## Phase 2 — ElevenLabs Voice

Goal: replace the text box with the real voice interview. Orchestrator unchanged.

### 2.1 Voice session client

- [ ] Create `lib/elevenlabs/client.ts` implementing `VoiceSessionClient`.
- [ ] Implement `startSession` to create an ElevenLabs Conversational AI conversation and return client token/conversation ID.
- [ ] Implement `buildSystemPrompt(ctx)` from `InterviewerContext`.
- [ ] Implement `updateContext` to push refreshed system prompt after each turn (or document limitation if unsupported).
- [ ] Implement transcript ingestion path (webhook or client callback → `POST /api/interviews/[id]/turns`).
- [ ] Add `ELEVENLABS_WEBHOOK_SECRET` handling if using webhooks.
- [ ] Unit tests for `buildSystemPrompt` and `VoiceSessionClient` with mocked ElevenLabs SDK.

### 2.2 API & UI updates for voice

- [ ] Add `POST /api/webhooks/elevenlabs` route to receive turn events.
- [ ] Update `app/interview/[id]/page.tsx` to embed ElevenLabs widget or WebSocket client.
- [ ] Add listening/speaking state indicators.
- [ ] Keep side panel polling from Phase 1.
- [ ] Implement session resume on reconnect from persisted DB state.

### 2.3 Phase 2 commit

- [ ] Commit: "feat: ElevenLabs voice integration".
- [ ] Manual demo: real voice interview drives the same adaptive loop and side-panel updates.

---

## Phase 3 — Review, Scenario Generation, Export & Python Runner

Goal: confirmed behavior spec compiles into a real, runnable artifact outside the app.

### 3.1 Review screen

- [ ] Create `app/interview/[id]/results/page.tsx`.
- [ ] Display confirmed, provisional, conflict, and unresolved rules.
- [ ] Inline edit for condition, expected behavior, exceptions.
- [ ] Confirm / mark-unresolved buttons.
- [ ] Show counts: confirmed, conflicts, unresolved.
- [ ] Component tests for review interactions.

### 3.2 Scenario generation

- [ ] Create `lib/intelligence/prompts/generateScenarios.ts`.
  - [ ] Input: confirmed rules + boundary values.
  - [ ] Output: scenarios tagged `normal`, `contrastive`, `boundary`, `adversarial`.
  - [ ] Enforce minimum 4 per type and total 10–20.
- [ ] Create `lib/intelligence/prompts/generateRubric.ts`.
- [ ] Unit tests with fixture rules asserting scenario coverage and type distribution.

### 3.3 Export

- [ ] Create `lib/evals/exporter.ts` to build the ZIP.
- [ ] Export files:
  - [ ] `behavior/specification.yaml`
  - [ ] `evals/normal.yaml`, `evals/contrastive.yaml`, `evals/boundary.yaml`, `evals/adversarial.yaml`
  - [ ] `graders/graders.py`
  - [ ] `sources/provenance.json`
  - [ ] `eval_config.yaml`
  - [ ] `README.md`
- [ ] Add `GET /api/interviews/[id]/export` route returning ZIP.
- [ ] Golden-file tests for exported YAML/JSON (compare against known-good snapshots).

### 3.4 Python eval runner

- [ ] Implement `evalinterview/loader.py` — load YAMLs, validate structure.
- [ ] Implement `evalinterview/runner.py` — for each scenario, POST to `target.endpoint`, receive `{ action }`.
- [ ] Implement `evalinterview/graders.py` — `deterministic()` and `rubric()`.
- [ ] Implement `evalinterview/cli.py` — `run` command with summary output and non-zero exit on failure.
- [ ] Add runner tests: point at a fake HTTP endpoint, verify pass/fail output.

### 3.5 Phase 3 commits

- [ ] Commit review screen.
- [ ] Commit scenario + rubric generation.
- [ ] Commit export functionality.
- [ ] Commit Python runner.
- [ ] Final Phase 3 commit: "feat: export executable eval suite and CLI runner".
- [ ] Manual demo: export suite from a real interview, run `evalinterview run ./exported`, see pass/fail.

---

## Phase 4 — UI Polish

Goal: four screens are launch-quality without adding new functionality.

### 4.1 Landing

- [ ] Polish `app/page.tsx`: headline, three-part architecture diagram, CTA.
- [ ] Responsive layout, clear value prop.

### 4.2 New Interview

- [ ] Polish form with placeholders, validation messages, loading state.
- [ ] Disable Start until knowledge source is provided.

### 4.3 Interview screen

- [ ] Polished transcript, voice controls, listening/speaking indicators.
- [ ] Prominent Context.dev side panel with badges for supported/conflict/uncovered counts.
- [ ] Use shadcn/ui cards, badges, collapsible sections.

### 4.4 Results screen

- [ ] Polished rule cards, scenario list, provenance links, download ZIP button.

### 4.5 Phase 4 commit

- [ ] Commit: "ui: polish landing, interview, and results screens".

---

## Phase 5 — Examples, README, Launch

Goal: repo is public-launch ready.

### 5.1 Example domains

- [ ] Create `examples/code-review-agent/` with sample knowledge source + transcript + generated suite.
- [ ] Create `examples/support-agent/` with sample knowledge source + transcript + generated suite.
- [ ] Create `examples/research-agent/` with sample knowledge source + transcript + generated suite.
- [ ] Each example includes a `README.md` explaining the domain and the key rule discovered.

### 5.2 README & docs

- [ ] Write root `README.md` per spec §38: one-liner, one conversation snippet, one extracted rule, one generated eval, architecture diagram, setup, usage.
- [ ] Update `AGENTS.md` with final commands, stack, conventions (if not already done during Phase 0).
- [ ] Update `docs/integrations.md` with exact endpoints discovered in Phase 0.
- [ ] Update `docs/roadmap.md` with actual phase completion notes.
- [ ] Remove temporary `docs/api-notes.md` if present.
- [ ] Add `LICENSE` (MIT or Apache-2.0).

### 5.3 Launch assets

- [ ] Generate architecture diagram (`docs/architecture.png` or SVG).
- [ ] Take screenshots of Landing, Interview, Results.
- [ ] Write demo script / video storyboard (as Markdown in `docs/demo-script.md`).
- [ ] Create `docs/starter-issues.md` with labeled contribution ideas (Promptfoo, Braintrust, OpenAI Evals, LangSmith exporters, CLI interview mode, multi-expert disagreement, Context.dev adapters).

### 5.4 Final verification

- [ ] Run `npm run lint` and `npx tsc --noEmit` and `npm run build`; fix errors.
- [ ] Run Python runner smoke test in CI or local script.
- [ ] Manually verify all 16 acceptance criteria from `EvalInterview-product-spec.md` §37.

### 5.5 Phase 5 commit(s)

- [ ] Commit examples.
- [ ] Commit README + docs polish.
- [ ] Commit launch assets.
- [ ] Final commit: "chore: prepare open-source launch".

---

## Ongoing Cross-Cutting Concerns

- [ ] **Tests**: add/update unit tests for every new `lib/` module; keep route and golden-file tests green.
- [ ] **Commits**: commit in small logical chunks; never one giant commit.
- [ ] **task.md**: tick boxes and include `task.md` updates in the relevant commit.
- [ ] **AGENTS.md**: keep it in sync with stack, commands, conventions, and this task list.
- [ ] **Security**: no secrets in code; use server-side env vars only.
- [ ] **Type safety**: `strict` TypeScript; no `any` without justification.
