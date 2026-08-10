# API Verification Notes (temporary)

This file captures the results of the Phase 0 smoke-test scripts before launch.
Delete it once the integration contracts are stable and documented in
`docs/integrations.md`.

## How to run

```bash
# Hyperfusion
npx tsx --env-file=.env scripts/verify-hyperfusion.ts

# Context.dev
npx tsx --env-file=.env scripts/verify-contextdev.ts

# Database
npx tsx --env-file=.env scripts/verify-db.ts

# ElevenLabs (pending ELEVENLABS_API_KEY)
npx tsx --env-file=.env scripts/verify-elevenlabs.ts
```

## Findings (verified 2026-08-10)

### Hyperfusion

- Base URL: `https://api.hyperfusion.io/v1` ✅
- Key access: restricted to model group `default`; usable model ID is
  **`openai/gpt-oss-120b`** (verified 200 on chat + JSON mode)
- Other listed models (`qwen/qwen3-32b`, `google/gemma-4-31b-it`, …) exist but
  were not access-tested with this key
- JSON mode: `response_format: { type: "json_object" }` ✅
- Models list `tools`, `tool_choice`, `structured_outputs` as supported
- **Caveat:** `gpt-oss-120b` is a reasoning model — responses include
  `reasoning_content`, which consumes the `max_tokens` budget. Set generous
  limits (e.g. ≥ 2048) for extraction/classification calls.

### Context.dev

- Base URL: `https://api.context.dev/v1` ✅
- **Context.dev is an ingestion API (scrape/crawl → clean Markdown), not a
  retrieval API.** Verified endpoints:
  - `GET /web/scrape/markdown?url=...` — 1 credit/page → `{ success, markdown, metadata }` ✅
  - `GET /web/scrape/sitemap?domain=...&search=...` — 1–2 credits → `{ success, urls[], meta }` ✅
  - `POST /web/search` — 1 credit/10 results (not tested; body: `{ query, numResults, includeDomains }`)
  - Batch crawl endpoints exist under `/batch/*` for large sites (not needed for MVP)
- No semantic retrieval endpoint exists. **Architecture consequence:**
  `ContextClient.registerSource` = sitemap discovery + markdown scrape of
  relevant pages → store chunks in Postgres (`source_chunks` table);
  `retrieve` = Postgres full-text search over stored chunks;
  `scanTopics` = sitemap URLs (+ optional `search` phrases) vs. covered topics.
- Credits observed: ~50,214 remaining at verification time.

### Supabase Postgres

- `DATABASE_URL` via session pooler
  (`aws-0-ap-southeast-2.pooler.supabase.com`) ✅ connected, PostgreSQL 17.6
- Schema pushed with `drizzle-kit push --force` ✅ (5 tables created)
- Note: direct host `db.<ref>.supabase.co` does not resolve without IPv6/paid
  IPv4 — always use the pooler. Passwords with special chars must be
  URL-encoded in the connection string.
- drizzle-kit does not auto-load `.env`; run with `set -a && . ./.env && set +a`
  prefix (already wrapped in `package.json` db scripts where needed).

### ElevenLabs Conversational AI

- Pending `ELEVENLABS_API_KEY` — verification script ready
  (`scripts/verify-elevenlabs.ts`).
- Agent created manually in console per `docs/elevenlabs-console-setup.md`
  (webhook tool `submit_expert_turn` → `POST /api/interviews/{id}/turns`).

## Decisions locked after verification

- [x] Hyperfusion model: `openai/gpt-oss-120b`, JSON mode, no tool calling needed initially
- [x] Context.dev source strategy: docs-site URL → sitemap discover + markdown scrape → local FTS retrieval
- [x] ElevenLabs turn ingestion: webhook tool calls `POST /api/interviews/[id]/turns`
