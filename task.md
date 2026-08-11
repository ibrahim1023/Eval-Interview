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
- [x] Run `drizzle-kit migrate` (or `db:push` against dev DB) to apply schema.
- [x] Write a tiny integration test (`scripts/verify-db.ts`) that verifies connectivity.

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
- [x] Commit: "chore: scaffold Next.js, Drizzle, and eval-runner skeleton".

---

## Phase 1 — Core Vertical Slice (Text Input)

Goal: the full adaptive elicitation loop works end to end with a text box. No voice yet.

### 1.1 Intelligence provider

- [x] Create `lib/intelligence/provider.ts` with the Phase 1 interface (extractRule, classifyEvidence, generateFollowUp; generateScenarios/generateRubric land in Phase 3).
- [x] Create `lib/intelligence/hyperfusion.ts` implementing the interface.
  - [x] Build a shared fetch wrapper for Hyperfusion (OpenAI-compatible).
  - [x] Implement `callStructured<T>(prompt, zodSchema)` with JSON-mode and one retry.
  - [x] Add `IntelligenceError` class for parse/failures.
- [x] Create `lib/intelligence/prompts/extractRule.ts` with few-shot examples.
- [x] Create `lib/intelligence/prompts/classifyEvidence.ts` with few-shot examples.
- [x] Create `lib/intelligence/prompts/generateFollowUp.ts` with probing/conflict/gap/contrastive/boundary strategies.
- [x] Unit tests for `extractRule`, `classifyEvidence`, `generateFollowUp` using mocked fetch (9 tests).

### 1.2 Context.dev client + local retrieval

Context.dev is an ingestion API (scrape/crawl → Markdown), not a retrieval API — verified in Phase 0. Retrieval is local over stored chunks.

- [ ] Add `source_chunks` table to `lib/db/schema.ts` (interview_id, url, title, content, token estimate) + `drizzle-kit generate`/`push`.
- [ ] Create `lib/context/client.ts` with `registerSource`, `retrieve`, `scanTopics`.
- [ ] `registerSource`: `GET /web/scrape/sitemap?domain=...` → pick relevant URLs → `GET /web/scrape/markdown?url=...` per page → store chunks in `source_chunks`.
- [ ] `retrieve(query)`: Postgres full-text search over `source_chunks` → `EvidenceChunk[]`.
- [ ] `scanTopics`: use sitemap URL list (+ optional `search` phrases) vs. topics already covered in the interview.
- [ ] Unit tests for `ContextClient` with mocked fetch and a mocked DB.

### 1.3 Rule repository & model helpers

- [x] Create `lib/rules/repository.ts` — DB CRUD for rules and evidence using Drizzle.
- [x] Create `lib/rules/model.ts` — pure functions for rule lifecycle transitions (provisional → confirmed/conflict/unresolved).
- [x] Unit tests for lifecycle helpers (5 tests).

### 1.4 Interview orchestrator

- [x] Create `lib/interview/orchestrator.ts` implementing `processTurn(interviewId, expertMessage)`.
  - [x] Persist expert message with monotonic `turnIndex`.
  - [x] Call `extractRule` with recent transcript.
  - [x] For each extracted rule, call `context.retrieve`.
  - [x] Call `classifyEvidence` and reconcile rules + evidence.
  - [x] Run `context.scanTopics` and compute coverage gaps.
  - [x] Call `generateFollowUp` with full context.
  - [x] Persist interviewer message.
  - [x] Return `{ question, snapshot }`.
- [x] Add error handling: on failure, persist a graceful fallback message.
- [x] Integration test for the full loop with in-memory fakes (8 tests).

### 1.5 API routes

- [x] `POST /api/interviews` — create interview and register Context.dev source.
- [x] `GET /api/interviews/[id]` — return interview + messages + rules + evidence.
- [x] `POST /api/interviews/[id]/turns` — run orchestrator and return next question + snapshot; doubles as the ElevenLabs webhook endpoint (secret-guarded).
- [x] `POST /api/interviews/[id]/finish` — move status to `review`.
- [x] Add Zod validation for every route body.

### 1.6 Minimal UI screens

- [x] Create `app/page.tsx` landing page with headline and CTA (matches approved mockup).
- [x] Create `app/interview/new/page.tsx` form: agent name, description, expert role, knowledge source.
- [x] Create `app/interview/[id]/page.tsx`:
  - [x] Text input box for expert answers (voice shim until Phase 2).
  - [x] Live transcript display.
  - [x] Side panel: rules discovered, Context.dev findings counts, finish button.
- [x] Client polls `GET /api/interviews/[id]` every 2.5 seconds during active interview.
- [x] Read-only results page at `/interview/[id]/results` (editing arrives in Phase 3).

### 1.7 Phase 1 commit(s)

- [x] End-of-sub-section commits for each major module (intelligence, context, rules, orchestrator, routes, UI).
- [x] Manual smoke test with live APIs: rule extracted, FTS evidence classified PARTIAL → conflict status, adaptive follow-up quotes the source. Verified 2026-08-10.

Known follow-up for later phases: near-duplicate rules across turns are not merged yet (resolve in review screen or add cheap dedupe).

---

## Phase 2 — ElevenLabs Voice

Goal: replace the text box with the real voice interview. Orchestrator unchanged.

### 2.1 Voice session client

- [x] Create `lib/elevenlabs/agent-config.ts` with a minimal static system prompt and webhook tool definition.
- [x] Create `lib/elevenlabs/client.ts` with `startConversation` and `deleteAgent`.
- [x] Add `ELEVENLABS_WEBHOOK_SECRET` handling in the webhook tool headers.
- [x] Implement `startConversation` to fetch a signed ElevenLabs Conversational AI URL using the shared `ELEVENLABS_AGENT_ID`.
- [x] Create `POST /api/interviews/[id]/voice/start` route returning the signed URL.
- [x] Transcript ingestion path: ElevenLabs agent calls `POST /api/interviews/[id]/turns` via the webhook tool (verified with live curl).
- [x] Unit tests for `buildSystemPrompt` and the client with mocked fetch (8 tests).

### 2.2 API & UI updates for voice

- [x] No separate `/api/webhooks/elevenlabs` route — the existing `turns` endpoint receives the agent's tool calls.
- [x] Update `app/interview/[id]/page.tsx` to use `@elevenlabs/react` `ConversationProvider` and `useConversation`.
- [x] Add listening/speaking state indicators in the interview footer.
- [x] Keep side panel polling from Phase 1.
- [ ] Implement session resume on reconnect from persisted DB state. (deferred — polling already recovers state)

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
