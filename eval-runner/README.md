# EvalInterview Eval Runner

Run exported EvalInterview eval suites against an HTTP agent.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Usage

```bash
evalinterview run ./generated-evals
```

The runner loads `eval_config.yaml`, runs every scenario in `evals/*.yaml` against the configured HTTP endpoint, grades responses, and exits non-zero if any eval fails.
