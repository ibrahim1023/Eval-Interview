# Examples

Three example eval suites in the export format (see `docs/architecture.md`
ADR-5). Each is self-contained and runnable with the eval runner.

| Example | Domain | What it demonstrates |
| ------- | ------ | -------------------- |
| `code-review-agent/` | PR review | Expert vs. handbook conflict surfaced and resolved mid-interview |
| `support-agent/` | Customer support | Expert-stated exception (fraud) overriding a policy threshold |
| `research-agent/` | Cited research | Coverage gap filled by the expert; an honestly `UNRESOLVED` rule |

```bash
cd eval-runner && pip install -e .
evalinterview run ../examples/code-review-agent   # point eval_config.yaml at your agent first
```
