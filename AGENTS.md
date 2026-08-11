# AGENTS.md

Guidance for AI coding agents working on this repository.

## What This Project Is

EvalInterview converts domain expertise and organizational knowledge into
executable behavioral evals for AI agents. It interviews a domain expert by
voice (ElevenLabs), retrieves evidence from Context.dev, detects conflicts and
gaps, and compiles a reviewed behavior spec into YAML scenarios and a Python
runner. Read `EvalInterview-product-spec.md` for scope; read `task.md` for the
current phase.

## Tech Stack

| Layer       | Choice                                    |
| ----------- | ----------------------------------------- |
| App         | Next.js (App Router), TypeScript          |
| Styling     | Tailwind CSS, shadcn/ui                   |
| Database    | Supabase Postgres + Drizzle ORM           |
| Voice       | ElevenLabs Conversational AI              |
| Retrieval   | Context.dev                               |
| LLM         | Hyperfusion.io behind `IntelligenceProvider` |
| Eval runner | Python, PyYAML, minimal dependencies      |

## Repository Layout

```text
app/              # Next.js routes (4 screens + api/)
components/       # shadcn/ui based components
lib/
  elevenlabs/     # Voice session client
  context/        # Context.dev client
  intelligence/   # IntelligenceProvider abstraction
  interview/      # Orchestration
  rules/          # Rule lifecycle and repository
  evals/          # Scenario generation and export
eval-runner/      # Python CLI: evalinterview run ./generated-evals
examples/         # domain-specific example data
scripts/          # one-time setup and verification scripts
docs/             # Architecture, data model, integrations, roadmap
```

## Commands

```bash
npm install
npm run dev          # local dev server
npm run build        # production build (must pass before merge)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (must pass before merge)
npm run test         # vitest
npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # apply migrations
npm run db:push      # push schema to dev DB
npm run db:studio    # Drizzle studio

cd eval-runner
pip install -e .
evalinterview run ./generated-evals
```

One-time ElevenLabs tool/agent setup scripts live in `scripts/` and are
documented in `docs/elevenlabs-console-setup.md`. Do not use the ElevenLabs
console JSON editor for this shape; its internal schema is unreliable.

## Core Invariants (do not violate)

1. **Domain-agnostic core.** No domain-specific logic in the engine. Domains live only in `examples/`.
2. **Real integrations only.** Production uses real ElevenLabs, Context.dev, and Hyperfusion. Mocks are allowed in tests only.
3. **No fabricated ground truth.** If the organization has no clear answer, record `UNRESOLVED`.
4. **Provenance is mandatory.** Every rule and generated eval must reference the interview turns and/or context sources that produced it.
5. **Never silently resolve conflicts.** Contradictions between expert statements and retrieved knowledge are always surfaced to the expert.
6. **Minimal infrastructure.** Next.js + Postgres. No microservices, queues, or Kubernetes unless an external API genuinely requires one.

## Code Conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- LLM access only via `IntelligenceProvider` (`lib/intelligence/`). Never call the model SDK directly from routes or components.
- External services only via their `lib/` clients (`elevenlabs/`, `context/`). Route handlers orchestrate; they do not contain vendor SDK details.
- Data model is minimal: `Interview`, `Message`, `Rule`, `Evidence`, `Scenario`. Do not expand without a documented reason.
- Scenario YAML and behavior-spec YAML are public contracts. Changing them is a breaking change.
- Keep the UI to the four spec'd screens: Landing, New Interview, Interview, Results.
- Match the surrounding style. Compact code; no speculative abstractions.

## Anti-Slop Rules

- No comments that restate the code.
- No dead code, unused imports, or commented-out blocks.
- No over-abstraction. Do not create a helper for something used once.
- No excessive error handling. Handle errors at the right boundary, not on every line.
- No generic boilerplate. No JSDoc/TSDoc on every function.
- No speculative features or "just in case" configuration.
- Write like a human. When in doubt, write less code.

## Explicit Non-Goals

Authentication (unless required), teams/orgs/RBAC, billing, SSO, observability,
production trace ingestion, CI integrations, GitHub App, Slack/Jira integrations,
multi-agent orchestration, workflow builders, dashboards, connector ecosystems,
fine-tuning, complex policy languages, multi-expert consensus. Multi-expert
interviewing is a future extension, not MVP.

## Definition of Done

- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Python runner changes are verified by running an exported suite.
- No secrets committed; `.env.example` updated if env vars changed.
- `task.md` checkboxes updated in the relevant commit.
- `README.md` updated if the change alters project status, setup, or major features.
- Core invariants still hold.

## After Finishing a Phase

- Kill every background process you started (`next dev`, servers, watchers, tunnels). Verify with `lsof -iTCP -sTCP:LISTEN -P | grep -E 'node|next|python'`.
- Close any browser previews.
- All tests green, work committed, `task.md` up to date.
