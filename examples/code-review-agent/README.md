# Code Review Agent — example eval suite

Example export from an EvalInterview session with a senior staff engineer,
against an engineering handbook knowledge source. Self-contained: no access to
the app required.

## The interview (excerpt)

The conflict that produced `rule-migration-safety`:

```text
EvalInterview:  What changes should automatically block approval?
Engineer:       Any destructive migration without a rollback path.

                [engine retrieves handbook/migrations]

EvalInterview:  Your handbook says migrations with passing tests are
                auto-approved — and it also requires a verified backup
                before any destructive change. Should the eval require
                both the rollback path and the verified backup?
Engineer:       Yes. Tests alone are not enough — no verified backup,
                no merge.
```

The contradiction between the handbook's "tests are enough" wording and the
expert's judgment was surfaced mid-interview and resolved by the expert —
the resolved rule carries both provenance trails.

## Layout

- `behavior/specification.yaml` — the reviewed behavior spec with provenance
- `evals/*.yaml` — scenarios by type (normal, contrastive, boundary, adversarial)
- `graders/graders.py` — grading reference + rubric criteria
- `sources/provenance.json` — interview turns and context sources per rule
- `eval_config.yaml` — point `target.endpoint` at the agent under test

## Run

```bash
pip install evalinterview  # or: pip install -e ./eval-runner from the repo
# edit eval_config.yaml → target.endpoint
evalinterview run .
```

The target endpoint receives POST { "input": <scenario input> } and must
respond with JSON containing an "action" field.
