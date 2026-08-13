# Current Work

Current phase: **Phase 5 — Examples, README, Launch**. See `docs/roadmap.md`
for the full phase plan and history.

## Completed

- **Phase 0** — scaffold, Drizzle/Supabase, eval-runner skeleton, external API verification.
- **Phase 1** — text-mode vertical slice (orchestrator, retrieval, rules, screens).
- **Phase 2** — ElevenLabs voice: signed-URL session route, webhook ingestion,
  auto-reconnect, live demo fixes. Loop verified live in the 2026-08-11
  Refund Copilot run (7/7 tool calls, conflict surfaced and resolved).
- **Phase 3** — review screen (Living Spec), scenario/rubric generation, ZIP
  export, Python runner. Verified end to end (live generate → export →
  `evalinterview run` against a stub agent).
- **Phase 4** — all four screens on the Living Spec design; instant local echo
  with positional reconciliation; atomic ack+tool-call prompt; `DESIGN.md`
  design contract with shared tokens (`bg-paper`, `border-hairline`, …).

## Phase 5 — Examples, README, Launch

- [x] `examples/` — three runnable example suites (code-review-agent,
  support-agent, research-agent) in the export contract, each with spec,
  scenarios (8: 2 per type), rubrics, provenance, and an interview excerpt.
  Verified: all three load through `evalinterview`'s loader.
- [x] README per spec §38: positioning → conversation → rule → eval →
  architecture; example YAML aligned to the real export contract; examples
  linked.
- [x] LICENSE (MIT) added; README "License: MIT" now backed by a file.
- [x] Architecture diagram redrawn around the actual loop
  (voice → webhook → orchestrator → knowledge/LLM → spec → ZIP → runner).
- [x] `docs/api-notes.md` removed (deferred from Phase 0).

### Remaining (require the human)

- [ ] Manual voice demo through the polished UI (covers the deferred Phase 2
  demo) — watch for ack/tool-call atomicity, drafting shimmer, local echo.
- [ ] Demo video (Code Review Agent migration/backup conflict moment) and
  screenshots for the README.
- [ ] GitHub launch prep: enable issues, file the starter contribution issues
  from the roadmap (exporters, scenario generators, CLI interview mode,
  multi-expert disagreement, Context.dev adapters) labeled `good first issue`.
- [ ] X launch per spec §40–41.

## Deferred from Phase 2/3

- **Concurrent-turn double-processing** — the turn replay guard is
  check-then-act; two genuinely concurrent turns for one interview could both
  process. ElevenLabs serializes turns and the timeout-resubmit path is
  covered by the replay guard, so this is a narrow theoretical race. If it
  ever surfaces, gate `processTurn` on a per-interview lock.
- **Contrastive scenarios bundle two cases into one expected action** — emit
  two linked scenario entries instead.
- **Scenario inputs are LLM-invented shapes** (dates as YAML date objects
  surfaced this). Runner handles it, but a stricter input contract would help.

## Completion Criteria (Phase 5)

- ~~Three example domains included and runnable.~~ Done (verified via loader).
- ~~README explains the product without a long explanation.~~ Done per §38.
- Remaining assets (video, screenshots, GitHub issues) are human tasks above.
