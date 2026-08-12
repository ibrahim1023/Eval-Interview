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

- [ ] `lib/intelligence/prompts/generateScenarios.ts` — input: confirmed rules; output: scenarios tagged normal/contrastive/boundary/adversarial (min 4 per type, 10–20 total).
- [ ] `lib/intelligence/prompts/generateRubric.ts`.
- [ ] Unit tests with fixture rules asserting coverage and type distribution.

### 3.3 Export

- [ ] `lib/evals/exporter.ts` — ZIP: `behavior/specification.yaml`, `evals/{normal,contrastive,boundary,adversarial}.yaml`, `graders/graders.py`, `sources/provenance.json`, `eval_config.yaml`, `README.md`.
- [ ] `GET /api/interviews/[id]/export` returning the ZIP.
- [ ] Golden-file tests for exported YAML/JSON (public contract — see `docs/architecture.md` ADR-5).

### 3.4 Python eval runner

- [ ] `evalinterview/loader.py` — load + validate YAMLs.
- [ ] `evalinterview/runner.py` — POST each scenario to `target.endpoint`, receive `{ action }`.
- [ ] `evalinterview/graders.py` — `deterministic()` and `rubric()`.
- [ ] `evalinterview/cli.py` — `run` command, summary output, non-zero exit on failure.
- [ ] Runner tests against a fake HTTP endpoint; smoke test with an exported suite.

## Known Issues (deferred from Phase 2)

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
