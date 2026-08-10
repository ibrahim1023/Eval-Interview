# API Verification Notes (temporary)

This file captures the results of the Phase 0 smoke-test scripts before launch.
Delete it once the integration contracts are stable and documented in
`docs/integrations.md`.

## How to run

```bash
# Hyperfusion
HYPERFUSION_API_KEY=... HYPERFUSION_BASE_URL=... npx tsx scripts/verify-hyperfusion.ts

# Context.dev
CONTEXT_API_BASE_URL=... CONTEXT_API_KEY=... npx tsx scripts/verify-contextdev.ts

# ElevenLabs
ELEVENLABS_API_KEY=... npx tsx scripts/verify-elevenlabs.ts
```

## Findings

### Hyperfusion

- Base URL:
- Models endpoint response:
- Chat completions endpoint response:
- JSON mode (`response_format: { type: "json_object" }`) supported: yes / no
- Function calling / tools supported: yes / no

### Context.dev

- Base URL:
- Source registration endpoint:
- Retrieval endpoint and response shape:
- Topic scan / coverage endpoint: exists / does not exist

### ElevenLabs Conversational AI

- Agent listing endpoint:
- Agent creation endpoint:
- Conversation start endpoint:
- Transcript / turn event delivery mechanism: webhook / client callback / SSE
- Mid-conversation context update supported: yes / no

## Decisions needed after verification

- [ ] Final Hyperfusion model name for extraction/classification/scenario generation.
- [ ] Final Context.dev source type(s) supported for the MVP.
- [ ] ElevenLabs turn ingestion mechanism (webhook vs client callback).
