# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## What This Project Is

**EvalInterview** converts domain expertise and existing organizational knowledge into
executable behavioral evals for AI agents. It interviews a domain expert by voice
(ElevenLabs), retrieves supporting/contradicting organizational knowledge
(Context.dev), detects conflicts and coverage gaps, adapts its follow-up questions,
and compiles the result into a portable, executable eval suite (YAML scenarios +
graders + Python CLI runner).

Read `EvalInterview-product-spec.md` first — it is the source of truth for scope.

## Core Invariants (do not violate)

1. **Domain-agnostic core.** No refund/support/coding-specific behavior in the
   engine. Domains live only in `examples/` as data.
2. **Real integrations only.** The production path uses real ElevenLabs, Context.dev,
   and a real LLM provider. Fixtures/mocks are allowed in tests only.
3. **No fabricated ground truth.** If the organization has no clear answer, record
   `UNRESOLVED`. Never invent expected behavior.
4. **Provenance is mandatory.** Every confirmed rule and every generated eval must
   reference the interview turns and/or context sources that produced it.
5. **Never silently resolve conflicts.** Contradictions between expert statements and
   retrieved knowledge are always surfaced to the expert for resolution.
6. **Minimal infrastructure.** Next.js app + Postgres. No microservices, no queues,
   no Kubernetes, no separate backend unless an external API genuinely requires one.

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
evalinterview/
├── app/                  # Next.js routes (4 screens + api/)
│   ├── page.tsx          # Landing
│   ├── interview/        # New interview + interview session + results
│   └── api/              # Route handlers (sessions, turns, rules, export)
├── components/           # UI components (shadcn/ui based)
├── lib/
│   ├── elevenlabs/       # Voice session client
│   ├── context/          # Context.dev client (retrieval)
│   ├── intelligence/     # IntelligenceProvider abstraction + impl
│   ├── interview/        # Interview orchestration (state machine)
│   ├── rules/            # Rule extraction, reconciliation, review
│   └── evals/            # Scenario generation + export
├── eval-runner/          # Python package: `evalinterview run ./generated-evals`
│   ├── evalinterview/
│   └── pyproject.toml
├── examples/             # code-review-agent/ support-agent/ research-agent/
├── docs/                 # Architecture, data model, integrations, roadmap
└── .env.example
```

## Environment Variables

```bash
# Required
DATABASE_URL=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
CONTEXT_API_BASE_URL=https://api.context.dev/v1
CONTEXT_API_KEY=
HYPERFUSION_API_KEY=
HYPERFUSION_BASE_URL=https://api.hyperfusion.io/v1

# Optional
ELEVENLABS_WEBHOOK_SECRET=
```

Never commit real keys. Keep `.env.example` in sync when adding new variables.

## Commands

```bash
# Web app
npm install
npm run dev            # local dev server
npm run build          # production build (must pass before merge)
npm run lint           # ESLint
npm run typecheck      # typecheck (must pass before merge)
npm run db:generate    # generate Drizzle migrations
npm run db:migrate     # apply Drizzle migrations
npm run db:push        # push schema to dev DB
npm run db:studio      # Drizzle studio

# Eval runner (Python)
cd eval-runner
pip install -e .
evalinterview run ./generated-evals
```

## Code Conventions

- **TypeScript strict mode.** No `any` without a comment explaining why.
- **LLM access only via `IntelligenceProvider`** (`lib/intelligence/`). Never call the
  model SDK directly from routes or components. The interface surface is:
  `extractRule`, `classifyEvidence`, `generateFollowUp`, `generateScenarios`,
  `generateRubric`. No multi-model routing.
- **External services only via their `lib/` clients** (`elevenlabs/`, `context/`).
  Route handlers orchestrate; they do not contain vendor SDK details.
- **Data model is intentionally minimal** — `Interview`, `Message`, `Rule`,
  `Evidence`, `Scenario` (see `docs/data-model.md`). Do not expand the schema
  without a documented reason.
- **Scenario YAML and behavior-spec YAML are public contracts** (see
  `docs/data-model.md`). Changing them is a breaking change — treat with care.
- Keep the UI to the four spec'd screens: Landing, New Interview, Interview, Results.
- Compact code; follow existing file patterns; no speculative abstractions.

## Anti-Slop Rules (avoid AI-generated code smell)

- **No comments that restate the code.** If the code says `const user = getUser()`, do not add `// Get the user`.
- **No dead code.** Delete unused imports, variables, functions, and commented-out blocks before committing.
- **No over-abstraction.** Do not create a helper function, interface, or class for something used once. Wait for the second use case.
- **No excessive error handling.** Handle errors at the right boundary (route handler, orchestrator), not on every line. Let unexpected errors bubble up and crash in development.
- **No generic boilerplate.** Do not add JSDoc/TSDoc to every function, or write `if (!x) throw new Error("x is required")` for every parameter when TypeScript already enforces it.
- **No speculative features.** Do not add options, hooks, or configuration "just in case." Build only what the spec and task list require.
- **Match the codebase style.** If existing files use early returns, single quotes, or a particular naming pattern, follow it. Do not introduce new patterns without a reason.
- **Write like a human.** Code should read as if a thoughtful engineer wrote it, not as if an LLM filled in a template. When in doubt, write less code.

## Explicit Non-Goals (do not build)

Authentication (unless needed), teams/orgs/RBAC, billing, SSO, agent observability,
production trace ingestion, CI integrations, GitHub App, Slack/Jira integrations,
multi-agent orchestration, workflow builders, custom dashboards, connector
ecosystems, fine-tuning, complex policy languages, multi-expert consensus.
Multi-expert interviewing is a future extension, not MVP.

## Interview Engine Rules of Thumb

- Ask one useful question at a time; conversational, not questionnaire-like.
- The next question is always derived from: conversation + current behavior model +
  Context.dev evidence. No fixed question lists.
- Evidence is classified as `SUPPORTED | CONFLICT | PARTIAL | NO_EVIDENCE |
  NEW_RELATED_AREA` and that classification drives follow-ups.
- Probe vague statements ("usually", "large", "sometimes") — boundaries and
  exceptions are where eval cases come from.
- Valid behavioral outcomes include `approve`, `reject`, `escalate`,
  `ask_for_information`, `abstain`, `request_confirmation`, `manual_review`, and
  `UNRESOLVED` — not just pass/fail.

## Documentation Map

- `EvalInterview-product-spec.md` — product scope (source of truth)
- `task.md` — live implementation checklist and phase tracker
- `docs/architecture.md` — system architecture, core loops, API design
- `docs/data-model.md` — DB schema and exported file formats
- `docs/integrations.md` — ElevenLabs / Context.dev / LLM provider contracts
- `docs/roadmap.md` — phased implementation plan and acceptance criteria

## Definition of Done (for any change)

- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Python runner: changes verified by actually running an exported suite.
- No secrets committed; `.env.example` updated if env vars changed.
- `task.md` checkboxes updated and included in the relevant commit.
- Core invariants above still hold.

## After Finishing a Phase

- **Kill every background process you started.** No dev servers (`next dev`),
  no HTTP servers, no watchers, no tunnels left running. Verify with
  `lsof -iTCP -sTCP:LISTEN -P | grep -E 'node|next|python'` and confirm clean.
- Close any browser previews opened during the phase.
- All tests green, work committed in small chunks, `task.md` up to date.
