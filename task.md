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

From live demo runs (2026-08-11). Not yet fixed — captured for triage:

- **Tool timeout vs. turn latency.** Server turns take ~7s warm (longer with a
  large transcript); through ngrok this sometimes exceeds the webhook tool's
  `response_timeout_secs` (20). Result: the agent says "Sorry, I missed that"
  / "I'm not sure I got that" even though the server completed the turn and
  the message shows in the chat. Queued fix: PATCH the tool to a larger
  timeout (e.g. 120s).
- **No turn idempotency.** When a tool call times out, the agent resubmits the
  same answer and the server processes it twice → duplicate expert messages
  and repeated questions (visible in DB after demo runs). Queued fix: dedupe
  identical consecutive expert turns and return the already-computed question.
- **Question appears in chat before it's spoken.** The UI polls every 2.5s and
  shows the persisted question while TTS is still generating — feels
  disjointed.
- **Crawl blocks interview creation with no progress.** Stripe took ~90s on
  the "Crawling knowledge source…" button; if the post-crawl redirect fails,
  the form hangs forever even though the interview was created. Queued fix:
  return immediately, crawl in background, show progress on the interview
  screen.
- **Conversational pacing.** Multi-second silence after each expert answer
  reads as the agent being stuck. Queued fix option: speak an immediate
  acknowledgment ("Got it, one moment…") while the loop runs.
- Near-duplicate rules across turns are not merged yet (resolve in the Phase 3
  review screen or add cheap dedupe).

## Completion Criteria (Phase 2)

- A real voice conversation drives the same adaptive loop proven in Phase 1.
- Context.dev findings visibly change the next spoken question.
- `npm run lint && npm run typecheck && npm run test && npm run build` all pass.
