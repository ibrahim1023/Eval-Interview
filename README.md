# EvalInterview

Your best evals aren't always in your test suite.

They're in your domain experts' heads and scattered across your docs,
repositories, and policies.

EvalInterview interviews an expert by voice, checks their judgment against
your existing knowledge, finds contradictions and missing rules, and compiles
the result into executable AI evals.

## What it does

1. Interviews a domain expert by voice using ElevenLabs Conversational AI.
2. Extracts provisional behavioral rules from the conversation.
3. Uses Context.dev to retrieve relevant documentation, code, and policies.
4. Detects supporting evidence, conflicts, and missing policy areas.
5. Asks adaptive follow-up questions based on what it finds.
6. Produces a reviewed behavior specification with provenance.
7. Compiles that specification into executable eval scenarios and graders.

## Example

```text
EvalInterview:
What changes should automatically block approval?

Engineer:
Any destructive migration without a rollback path.

Context.dev:
The engineering guide also requires a verified backup.

EvalInterview:
Should the eval require both the rollback path
and a verified backup?

Engineer:
Yes.
```

Rule discovered:

```yaml
id: migration_safety
condition:
  pull_request_contains_destructive_migration: true
requirements:
  - rollback_plan_present
  - verified_backup_present
otherwise: block
```

Generated eval:

```yaml
id: migration_without_backup
type: contrastive
input:
  pull_request:
    migration: destructive
    rollback_plan: true
    verified_backup: false
expected:
  action: block
```

## Architecture

```text
Next.js Application
       │
       ├── ElevenLabs      (voice interview)
       ├── Context.dev     (organizational knowledge)
       ├── Hyperfusion     (LLM reasoning)
       └── Supabase Postgres (persistence)
```

No microservices, no queues, no separate backend.

## Status

This repository is under active development. Phase 0 (scaffold) is complete.
See [`task.md`](./task.md) for the live implementation checklist and
[`docs/`](./docs/) for architecture, data model, and integration contracts.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in DATABASE_URL, ELEVENLABS_*, CONTEXT_API_*, HYPERFUSION_*
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Eval runner

```bash
cd eval-runner
python -m venv .venv
source .venv/bin/activate
pip install -e .
evalinterview run ./generated-evals
```

## License

MIT
