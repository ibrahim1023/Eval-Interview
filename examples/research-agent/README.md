# Research Agent — example eval suite

Example export from an EvalInterview session with a research lead, against an
internal research-handbook knowledge source. Self-contained: no access to the
app required.

## The interview (excerpt)

The gap that produced `rule-express-uncertainty`:

```text
EvalInterview:  When sources conflict, what should the agent do?
Research lead:  If they're equally strong, it should say so. A confident
                answer built on a coin flip is worse than no answer.
EvalInterview:  Your handbook covers sourcing but says nothing about
                conflicting evidence — this is a new area. Should
                "state the uncertainty" become a rule?
Research lead:  Yes. Never pick a side quietly.
```

The handbook had no policy for conflicting evidence — the engine flagged the
uncovered area and the expert filled it. The preprint question, by contrast,
had no clear organizational answer and was recorded as `unresolved` rather
than guessed.

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
