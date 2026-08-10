# EvalInterview — Data Model

Two layers of data:

1. **Internal state** (Postgres via Supabase) — sessions, transcript, rules,
   evidence, scenarios. Intentionally minimal; do not expand without a documented
   reason.
2. **Exported artifacts** (YAML/JSON files) — the public, portable contract consumed
   by the Python runner and external tools. Versioned from day one.

---

## 1. Internal Schema (Postgres)

TypeScript shapes (source of truth in `lib/`, mirrored by DB tables):

### Interview

```typescript
type Interview = {
  id: string
  agentName: string
  agentDescription: string
  expertRole: string
  status: "active" | "review" | "complete"
}
```

DB additions (not in the API type): `knowledge_source` (Context.dev reference),
`created_at`, `updated_at`.

### Message

```typescript
type Message = {
  id: string
  interviewId: string
  speaker: "expert" | "interviewer"
  content: string
  createdAt: string
}
```

`turn_index` (monotonic per interview) is stored so provenance can reference
`turn_N` stably.

### Rule

```typescript
type Rule = {
  id: string
  interviewId: string
  condition: string
  expectedBehavior: string
  exceptions: string[]
  status: "provisional" | "confirmed" | "conflict" | "unresolved"
  interviewSources: string[]   // e.g. ["turn_12", "turn_18"]
  contextSources: string[]     // e.g. ["engineering-handbook/migrations"]
}
```

Lifecycle:

```text
provisional ──(evidence supports, expert confirms)──> confirmed
     │
     ├──(evidence contradicts)──> conflict ──(expert resolves)──> confirmed | unresolved
     │
     └──(no clear org answer)──> unresolved
```

### Evidence

```typescript
type Evidence = {
  id: string
  interviewId: string
  ruleId?: string              // null when it represents a NEW_RELATED_AREA gap
  source: string               // Context.dev source reference
  content: string
  relationship: "supported" | "conflict" | "partial" | "new_area"
}
```

The `new_area` relationship with `ruleId = null` is how coverage gaps are
represented and surfaced in the side panel.

### Scenario

```typescript
type Scenario = {
  id: string
  interviewId: string
  type: "normal" | "contrastive" | "boundary" | "adversarial"
  input: unknown               // scenario payload; shape is domain-defined
  expectedBehavior: string     // e.g. "block", "approve", "escalate"
  ruleIds: string[]            // rules this scenario covers — required, never empty
}
```

Valid expected behaviors are the spec's action vocabulary (`approve`, `reject`,
`escalate`, `ask_for_information`, `abstain`, `request_confirmation`,
`manual_review`) — not just pass/fail. `UNRESOLVED` rules never produce graded
scenarios.

### SourceChunk (added after Phase 0 verification)

Context.dev is an ingestion API (scrape → Markdown), not a retrieval API, so we
store crawled pages locally and search them ourselves.

```typescript
type SourceChunk = {
  id: string
  interviewId: string
  url: string
  title: string
  content: string          // Markdown body from Context.dev scrape
  createdAt: string
}
```

Retrieval is Postgres full-text search over `content` (+ `title`). One row per
crawled page; chunking is page-level at MVP.

### Suggested DDL sketch

```sql
create table interviews (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  agent_description text not null,
  expert_role text not null,
  knowledge_source jsonb,
  status text not null default 'active'
    check (status in ('active','review','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  turn_index int not null,
  speaker text not null check (speaker in ('expert','interviewer')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (interview_id, turn_index)
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  condition text not null,
  expected_behavior text not null,
  exceptions text[] not null default '{}',
  status text not null default 'provisional'
    check (status in ('provisional','confirmed','conflict','unresolved')),
  interview_sources text[] not null default '{}',
  context_sources text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  rule_id uuid references rules(id) on delete set null,
  source text not null,
  content text not null,
  relationship text not null
    check (relationship in ('supported','conflict','partial','new_area')),
  created_at timestamptz not null default now()
);

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  type text not null
    check (type in ('normal','contrastive','boundary','adversarial')),
  input jsonb not null,
  expected_behavior text not null,
  rule_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create index on messages (interview_id, turn_index);
create index on rules (interview_id, status);
create index on evidence (interview_id);
create index on scenarios (interview_id);

create table source_chunks (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  url text not null,
  title text not null default '',
  content text not null,
  created_at timestamptz not null default now(),
  unique (interview_id, url)
);

create index on source_chunks (interview_id);
create index on source_chunks using gin (to_tsvector('english', title || ' ' || content));
```

---

## 2. Exported Artifacts (public contract)

All exported files carry `spec_version: 1`. Bumping the version is a breaking
change requiring runner support for both versions.

### 2.1 `behavior/specification.yaml`

The confirmed behavior specification — the IR between human knowledge and evals.

```yaml
spec_version: 1
agent:
  name: Code Review Agent
  description: Reviews pull requests and determines whether changes are safe to merge.

rules:
  - id: migration_safety
    condition:
      pull_request_contains_destructive_migration: true
    requirements:
      - rollback_plan_present
      - verified_backup_present
    expected_action: approve_if_all_requirements_met
    otherwise: block
    exceptions: []
    status: confirmed           # confirmed rules only; unresolved listed separately
    provenance:
      interview_turns: [turn_12, turn_18]
      context_sources: [engineering-handbook/migrations]

unresolved:
  - id: schema_compat_policy
    question: Should schema-incompatible changes auto-block?
    provenance:
      interview_turns: [turn_31]
```

### 2.2 `evals/*.yaml` — one file per scenario type

```yaml
spec_version: 1
scenarios:
  - id: migration_without_backup
    type: contrastive
    input:
      pull_request:
        migration: destructive
        rollback_plan: true
        verified_backup: false
    expected:
      action: block
    covers:
      - migration_safety
    evidence:
      interview_turns: [turn_18]
      context: [engineering-handbook/migrations]
    grader: deterministic        # or: rubric
```

Target: 10–20 scenarios per interview across all four files; every scenario has a
non-empty `covers` list. Quality over volume.

### 2.3 `graders/graders.py`

Two grader types only.

```python
def deterministic(actual: dict, expected: dict) -> bool:
    return actual["action"] == expected["action"]

RUBRICS = {
    "migration_without_backup": [
        "identifies the missing backup",
        "does not approve the migration",
        "clearly explains why approval is blocked",
    ]
}
```

Rubric grading at run time is LLM-judged against the criteria list (runner calls a
model only when a scenario's grader is `rubric`).

### 2.4 `sources/provenance.json`

```json
{
  "interview_id": "...",
  "generated_at": "...",
  "knowledge_sources": [{ "type": "documentation", "ref": "engineering-handbook" }],
  "turn_map": { "turn_12": "Any destructive migration without a rollback path should be blocked." }
}
```

Lets a reader trace every expectation back to a human decision or document.

### 2.5 `eval_config.yaml`

```yaml
spec_version: 1
agent:
  name: Code Review Agent
target:
  type: http                     # or: command
  endpoint: http://localhost:8080/review
grading:
  rubric_model: <provider-model> # used only for rubric graders
```

The runner must work entirely from this directory — no EvalInterview DB access.

### 2.6 Exported tree

```text
generated-evals/
├── behavior/specification.yaml
├── evals/normal.yaml
├── evals/contrastive.yaml
├── evals/boundary.yaml
├── evals/adversarial.yaml
├── graders/graders.py
├── sources/provenance.json
├── eval_config.yaml
└── README.md
```

---

## 3. Mapping: Internal → Exported

| Internal | Exported |
| -------- | -------- |
| `Interview` | `behavior/specification.yaml#agent`, `eval_config.yaml#agent` |
| `Message` (turn_index) | `provenance.json#turn_map`, `interview_turns` refs |
| `Rule` (confirmed) | `specification.yaml#rules[]` |
| `Rule` (unresolved/conflict) | `specification.yaml#unresolved[]` + results screen |
| `Evidence` | `provenance` blocks + `provenance.json#knowledge_sources` |
| `Scenario` | `evals/<type>.yaml#scenarios[]` |

Export is a pure function of DB state — regenerating the ZIP for the same
interview state must produce identical artifacts (stable IDs, stable ordering).
