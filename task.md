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
- [ ] Session resume on reconnect from persisted DB state (deferred — polling already recovers state).

### Remaining

- [ ] Manual demo: a real voice interview drives the adaptive loop and the side panel updates live.

## Known Issues

- Near-duplicate rules across turns are not merged yet (resolve in the Phase 3
  review screen or add cheap dedupe).
- Voice session resume on reconnect is not implemented; UI state recovers via
  polling, but a dropped WebSocket requires starting a new session.

## Completion Criteria (Phase 2)

- A real voice conversation drives the same adaptive loop proven in Phase 1.
- Context.dev findings visibly change the next spoken question.
- `npm run lint && npm run typecheck && npm run test && npm run build` all pass.
