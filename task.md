# Current Work

Current phase: **Phase 4 — UI Polish**. Approved design: `mockups/interview-v3.html`
and `mockups/results-v3.html` ("Living Spec"). See `docs/roadmap.md` for the full
phase plan and history.

## Completed

- **Phase 0** — scaffold, Drizzle/Supabase, eval-runner skeleton, external API verification.
- **Phase 1** — text-mode vertical slice (orchestrator, retrieval, rules, screens).
- **Phase 2** — ElevenLabs voice: signed-URL session route, webhook ingestion,
  auto-reconnect, live demo fixes (timeouts, idempotency, background crawl,
  pacing, rule dedupe, conflict exit conditions). **Manual demo deferred to
  after Phase 4** per project decision 2026-08-12; the loop was verified live
  in the 2026-08-11 Refund Copilot run (7/7 tool calls, conflict surfaced and
  resolved, graceful handling of unknowns).
- **Phase 3** — review screen (Living Spec), scenario/rubric generation, ZIP
  export, Python runner. Verified end to end (live generate → export →
  `evalinterview run` against a stub agent).

## Phase 4 — UI Polish

- [x] Interview screen rebuilt to `mockups/interview-v3.html`: conversation rail,
  live spec document (sections, stamps, conflict margin notes, drafting shimmer),
  waveform voice bar; expert utterance echoes instantly from SDK transcript events.
- [x] Landing page in the v3 design language (paper/ink/serif).
- [x] New Interview form: URL validation with message, "Creating interview…"
  loading state, Start disabled until a valid knowledge source URL.
- [x] Ack + tool call made atomic in the agent prompt; cloud agent re-PATCHed
  (verified: tool still attached, new prompt live).
- [x] Follow-up prompt input trimmed to a 12-message transcript tail.

### Remaining

- [ ] Manual voice demo through the polished UI (covers the deferred Phase 2 demo).

## Deferred from Phase 2/3

- **Agent acknowledges but skips the tool call** (2 of 9 turns) — addressed in
  Phase 4 via the atomic ack/tool prompt change; validate in the next voice run.
- **Contrastive scenarios bundle two cases into one expected action** — emit two
  linked scenario entries instead.
- **Question appears in chat before it's spoken** — superseded by v3 design
  (agent line renders on the SDK speech event, synced with voice).

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

## Completion Criteria (Phase 4)

- ~~All four screens match the approved Living Spec mockups.~~ Done.
- ~~`npm run lint && npm run typecheck && npm run test && npm run build` all pass.~~ Done (59 tests).
- The deferred Phase 2 manual voice demo runs clean through the polished UI
  (watch for: ack-then-tool-call atomicity, drafting shimmer, instant local echo).
