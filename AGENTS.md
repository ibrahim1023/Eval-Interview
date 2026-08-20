# AGENTS.md

Guidance for AI coding agents working on this repository.

## What This Project Is

EvalInterview converts domain expertise and organizational knowledge into
executable behavioral evals for AI agents. It interviews a domain expert by
voice (ElevenLabs), retrieves evidence from Context.dev, detects conflicts and
gaps, and compiles a reviewed behavior spec into YAML scenarios and a Python
runner. Read `EvalInterview-product-spec.md` for scope, `task.md` for current
work, `docs/architecture.md` for design rationale, and `docs/roadmap.md` for
phase history and plans.

## Stack & Layout

Next.js App Router + TypeScript, Tailwind + shadcn/ui, Supabase/Postgres +
Drizzle, ElevenLabs Conversational AI, Context.dev, Hyperfusion.io behind
`IntelligenceProvider`. Python is used only for `eval-runner/`.

Core logic:
- `lib/interview/` orchestration (owns the per-turn loop)
- `lib/intelligence/` LLM boundary (`IntelligenceProvider` + versioned prompts)
- `lib/context/` Context.dev ingestion + local Postgres FTS retrieval over `source_chunks`
- `lib/elevenlabs/` voice session client and agent config
- `lib/rules/` rule lifecycle and repository
- `lib/evals/` scenario generation and export (ZIP contract — see `docs/architecture.md` ADR-5)
- `lib/db/` Drizzle schema and client
- `app/` four screens + thin API route handlers
- `eval-runner/` Python CLI: `evalinterview run ./generated-evals`
- `scripts/` one-time setup and verification scripts

## Commands

```bash
npm run dev / lint / typecheck / test / build
npm run db:generate / db:migrate / db:push / db:studio
cd eval-runner && pip install -e . && evalinterview run ./generated-evals
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

## Boundaries & Conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- LLM access only via `IntelligenceProvider` (`lib/intelligence/`). Never call the model SDK directly from routes or components.
- External services only via their `lib/` clients (`elevenlabs/`, `context/`). Route handlers orchestrate; they do not contain vendor SDK details.
- Keep persistence minimal. Core tables are `interviews`, `messages`, `rules`, `evidence`, `scenarios`, plus `source_chunks` for retrieved knowledge. Do not add persistent entities without a concrete product requirement.
- Scenario YAML and behavior-spec YAML are public contracts. Changing them is a breaking change.
- Keep the UI to the four spec'd screens: Landing, New Interview, Interview, Results.
- All UI follows `DESIGN.md` (the Living Spec design contract). Use its tokens (`bg-paper`, `bg-paper-rail`, `border-hairline`, `bg-shimmer`, `bg-signal`/`text-signal` from `app/globals.css`) — never hardcode hex values in components.
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

## Verification

For iterative work, run the narrowest executable checks that prove the change;
run affected tests first. Before merging, finishing a phase, or making
repository-wide changes, all of these must pass:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Python runner changes must also be verified with the relevant Python tests or
an exported-suite smoke test. Commit no secrets; update `.env.example` if env

Accepted risk (2026-08-20): `npm audit` flags `esbuild <=0.24.2`
(GHSA-67mh-4wv8-2f99) via the abandoned `@esbuild-kit/*` chain inside
`drizzle-kit`. Dev-only CLI tooling; the advisory targets esbuild's dev
server, which nothing here runs. Do not "fix" it with `npm audit fix
--force` (that downgrades drizzle-kit to a breaking version); wait for
drizzle-kit 1.x to drop the chain.
vars change. Update `task.md` in the same commit as the work it tracks. Keep
`README.md` free of implementation progress — it is human-facing product
documentation; status lives in `docs/roadmap.md`, current work in `task.md`.
Update `README.md` only when setup or usage instructions change.

## After Finishing a Phase

- Kill every background process you started (`next dev`, servers, watchers, tunnels). Verify with `lsof -iTCP -sTCP:LISTEN -P | grep -E 'node|next|python'`.
- Close any browser previews.
- All tests green, work committed, `task.md` up to date.
