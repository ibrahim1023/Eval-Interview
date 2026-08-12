# Support Agent — example eval suite

Example export from an EvalInterview session with a support lead, against a
helpdesk policy knowledge source. Self-contained: no access to the app
required.

## The interview (excerpt)

The exception that shaped `rule-refund-threshold`:

```text
EvalInterview:  Your policy requires manager sign-off over $500.
                Is that the whole rule?
Support lead:   Pretty much — under $500 we just approve.
EvalInterview:  And over $500 with sign-off, always approve?
Support lead:   No — if anything smells like fraud, skip the sign-off
                question entirely and escalate. Fraud always escalates.
```

The expert's fraud exception became part of the rule, and the adversarial
suite tests it: a sub-threshold refund with a manager sign-off but a fraud
signal must still escalate.

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
