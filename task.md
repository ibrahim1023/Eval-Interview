# Current Work

Current phase: **Phase 2 — ElevenLabs Voice**. See `docs/roadmap.md` for the
full phase plan and history; see git history for implementation detail.

## Completed

- **Phase 0** — scaffold, Drizzle/Supabase setup, eval-runner skeleton, external
  API verification (findings in `docs/api-notes.md`).
- **Phase 1** — text-mode vertical slice: `IntelligenceProvider` (Hyperfusion),
  Context.dev client with local FTS retrieval over `source_chunks`, rules
  model/repository, interview orchestrator, API routes, four screens.
  Smoke-tested with live APIs 2026-08-10.

## Phase 2 — ElevenLabs Voice

### Voice session

- [x] `lib/elevenlabs/` agent config + client (`startConversation`, `deleteAgent`).
- [x] `ELEVENLABS_WEBHOOK_SECRET` guard on the turns webhook.
- [x] `POST /api/interviews/[id]/voice/start` returning a signed URL.
- [x] Transcript ingestion: the ElevenLabs agent calls `POST /api/interviews/[id]/turns` via the webhook tool (verified with live curl).
- [x] Unit tests for `buildSystemPrompt` and the client (8 tests).

### Voice UI

- [x] Interview screen uses `@elevenlabs/react` (`ConversationProvider` / `useConversation`).
- [x] Listening/speaking state indicators in the interview footer.
- [x] Side-panel polling kept from Phase 1.
- [x] Session resume on reconnect: unexpected disconnects auto-reconnect with a fresh signed URL and the same `interview_id` (up to 3 attempts); orchestrator state persists in Postgres, so the loop continues from the last turn.

### Remaining

- [ ] Manual demo: a real voice interview drives the adaptive loop and the side panel updates live.

## Known Issues

From live demo runs (2026-08-11):

- ~~Tool timeout vs. turn latency~~ — fixed: tool `response_timeout_secs`
  raised 20s → 120s on the live ElevenLabs tool.
- ~~No turn idempotency~~ — fixed: resubmitted identical expert turns replay
  the already-computed question instead of reprocessing.
- **Question appears in chat before it's spoken** — by design: the question is
  persisted when the webhook returns, while TTS is still generating. The
  transcript leads the voice by a few seconds; no planned change.
- ~~Crawl blocks interview creation with no progress~~ — fixed: interviews
  create instantly; the crawl runs via `after()` with `crawl_status` on the
  interview, and the interview screen shows "Preparing knowledge base…" until
  ready.
- ~~Conversational pacing~~ — fixed: the agent prompt now requires a short
  spoken acknowledgment before each tool call (cloud agent re-PATCHed).
- ~~Near-duplicate rules not merged~~ — fixed: `extractRule` sees the existing
  behavior model and the orchestrator drops near-duplicates (word-overlap
  similarity ≥ 0.7). Finer merging/editing lands with the Phase 3 review
  screen.
- **Interviewer looped on unresolved points** (observed 2026-08-11) — fixed:
  the strategist must abandon a sticking point after two failed attempts and
  can mark rules `unresolved` via `abandonRuleIds`.

## Completion Criteria (Phase 2)

- A real voice conversation drives the same adaptive loop proven in Phase 1.
- Context.dev findings visibly change the next spoken question.
- `npm run lint && npm run typecheck && npm run test && npm run build` all pass.
