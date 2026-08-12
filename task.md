# Current Work

Current phase: **Phase 3 — Review, Scenario Generation, Export & Python Runner**.
Approved design: `mockups/results-v3.html` ("Living Spec" document review).
See `docs/roadmap.md` for the full phase plan and history.

## Completed

- **Phase 0** — scaffold, Drizzle/Supabase, eval-runner skeleton, external API verification.
- **Phase 1** — text-mode vertical slice (orchestrator, retrieval, rules, screens).
- **Phase 2** — ElevenLabs voice: signed-URL session route, webhook ingestion,
  auto-reconnect, live demo fixes (timeouts, idempotency, background crawl,
  pacing, rule dedupe, conflict exit conditions). **Manual demo deferred to
  after Phase 4** per project decision 2026-08-12; the loop was verified live
  in the 2026-08-11 Refund Copilot run (7/7 tool calls, conflict surfaced and
  resolved, graceful handling of unknowns).

## Phase 3 — Review, Scenario Generation, Export & Runner

### 3.1 Review screen (per mockups/results-v3.html)

- [x] `POST /api/interviews/[id]/rules/[ruleId]` — confirm, edit (condition/expectedBehavior/exceptions), reopen, mark unresolved. Verified live against dev DB (incl. 404 on cross-interview IDs).
- [x] Rebuild `app/interview/[id]/results/page.tsx` as the v3 document: sections with status stamps, conflict cards (expert vs. source side-by-side with resolution choices), unresolved notes with reopen, inline edit with save/save-and-confirm.
- [x] Export gating: export disabled until every conflict is resolved or explicitly marked unresolved.

### 3.2 Scenario & rubric generation

- [x] `lib/intelligence/prompts/generateScenarios.ts` — confirmed rules in; scenarios tagged normal/contrastive/boundary/adversarial (verified live: 16 scenarios, 4 per type).
- [x] `lib/intelligence/prompts/generateRubric.ts` — criteria per rubric-graded scenario.
- [x] `POST /api/interviews/[id]/generate` — generates + persists suite (scenarios table gained `slug`, `grader`, `criteria` columns; migration 0003).
- [x] Unit tests with fixture rules (prompt builders + provider schemas).

### 3.3 Export

- [x] `lib/evals/exporter.ts` — ZIP: `behavior/specification.yaml`, `evals/{normal,contrastive,boundary,adversarial}.yaml`, `graders/graders.py`, `sources/provenance.json`, `eval_config.yaml`, `README.md`.
- [x] `GET /api/interviews/[id]/export` returning the ZIP (409 before generation).
- [x] Golden-file tests for the export contract (`lib/evals/golden/`, ADR-5).

### 3.4 Python eval runner

- [x] `loader.py` — config, scenarios, and rubrics (imports RUBRICS from exported `graders/graders.py`).
- [x] `runner.py` — POST each scenario to `target.endpoint`; YAML date objects serialized safely; target/judge errors become failed evals, not crashes.
- [x] `graders.py` — `deterministic()` + real `rubric()` LLM judge (`EVAL_LLM_BASE_URL`/`EVAL_LLM_API_KEY`, model from `eval_config.yaml`).
- [x] `cli.py` — `evalinterview run <dir>` group, summary output, non-zero exit on failure.
- [x] Runner tests (8, pytest + responses, fixture suite).
- [x] End-to-end smoke: live generate → export → `evalinterview run` against a stub agent → 6/16 with rule-referenced failures (stub is intentionally naive).

## Known Issues (deferred from Phase 2)

From the Phase 3 smoke run:

- **Contrastive scenarios bundle two cases into one expected action**
  ("approve scenario_a and deny scenario_b"), which deterministic grading
  can't check. Fix direction: emit contrastives as two linked scenario entries
  with separate expected actions.
- **Scenario inputs are LLM-invented shapes** (dates as YAML date objects
  surfaced this). Runner handles it, but a stricter input contract would help.

- **Agent acknowledges but skips the tool call** (2 of 9 turns, 2026-08-11 run):
  make ack + tool call atomic in the prompt; if it persists, bump the agent LLM.
- **Residual turn latency** (~10-24s worst): trim prompt sizes (transcript tail
  for follow-ups).
- **Transcript UX timing**: render the expert's utterance immediately from SDK
  local transcript events; reconcile with polled state. (v3 interview mockup
  covers the intended design.)
- **Question appears in chat before it's spoken** — by design (persisted with
  the webhook response; TTS lags the transcript).

## Completion Criteria (Phase 3)

- Confirmed spec exports as a ZIP and `evalinterview run ./exported` passes/fails
  against a stub agent with rule references in the output.
- Golden-file tests green; `npm run lint && npm run typecheck && npm run test && npm run build` all pass.
