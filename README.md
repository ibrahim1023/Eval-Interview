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

One conversation:

```text
EvalInterview:  What changes should automatically block approval?
Engineer:       Any destructive migration without a rollback path.

                [engine retrieves handbook/migrations]

EvalInterview:  Your handbook also requires a verified backup before
                any destructive change. Should the eval require both
                the rollback path and the verified backup?
Engineer:       Yes. No verified backup, no merge.
```

One extracted rule:

```yaml
- id: rule-migration-safety
  when: PR contains a destructive migration
  expect: Require a rollback plan and a verified backup, otherwise block
  exceptions:
    - Hotfixes with on-call approval
  status: confirmed
  provenance:
    interview_turns: [turn_3, turn_7]
    context_sources: [handbook/migrations]
```

One generated eval:

```yaml
- id: migration_rollback_without_backup
  type: contrastive
  input:
    pull_request:
      migration: destructive
      rollback_plan: true
      verified_backup: false
  expected:
    action: block
  covers: [rule-migration-safety]
  grader: rubric
```

Full runnable suites in [`examples/`](./examples/) — code review, customer
support, and cited research agents.

## Architecture

```text
Expert ──voice──▶ ElevenLabs ──webhook──▶ Orchestrator (Next.js)
                                              │
                    ┌─────────────────────────┤
                    ▼                         ▼
              Context.dev               Hyperfusion LLM
              (docs, policies)          (extract · classify · follow up)
                    │                         │
                    └───────▶ Postgres ◀──────┘
                                  │
                                  ▼
                    Behavior spec ──▶ eval suite ZIP
                                  │
                                  ▼
                    evalinterview run (Python CLI, runs anywhere)
```

No microservices, no queues, no separate backend. The voice agent is a thin
transport; all reasoning happens server-side.

## Status

This repository is under active development. For roadmap and implementation
status, see [`docs/roadmap.md`](./docs/roadmap.md); for architecture and
integration contracts, see [`docs/`](./docs/).

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in DATABASE_URL, ELEVENLABS_*, CONTEXT_API_*, HYPERFUSION_*
```

Create the ElevenLabs tool and shared agent via the provided scripts (the
console JSON editor is unreliable for this shape):

```bash
# 1. Create the submit_expert_turn webhook tool
npx tsx scripts/create-elevenlabs-tool.ts

# 2. Create the eval-builder agent and attach the tool
ELEVENLABS_TOOL_ID=<tool-id> npx tsx scripts/create-elevenlabs-agent.ts
```

Save the returned agent ID and add it to `.env` as `ELEVENLABS_AGENT_ID`, then:

```bash
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
