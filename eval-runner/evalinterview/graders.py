"""Grader implementations for exported eval scenarios."""

from __future__ import annotations

import json
import os
from typing import Any

import requests


def deterministic(actual: dict[str, Any], expected: dict[str, Any]) -> bool:
    """Compare structured action equality."""
    return actual.get("action") == expected.get("action")


JUDGE_PROMPT = """You are grading an AI agent's response against a rubric.

Scenario input:
{scenario_input}

Agent response:
{actual}

Criteria (all must hold for a pass):
{criteria}

Respond with JSON only: {{"pass": true/false, "reason": "one sentence"}}"""


def rubric(
    actual: dict[str, Any],
    criteria: list[str],
    scenario_input: dict[str, Any],
    *,
    model: str,
    base_url: str | None = None,
    api_key: str | None = None,
    timeout: int = 60,
) -> bool:
    """LLM-judged grading against a criteria list.

    Uses an OpenAI-compatible chat endpoint configured via EVAL_LLM_BASE_URL /
    EVAL_LLM_API_KEY (model comes from the suite's eval_config.yaml).
    """
    if not criteria:
        raise ValueError("rubric grading requires criteria")
    base_url = base_url or os.environ.get("EVAL_LLM_BASE_URL", "")
    api_key = api_key or os.environ.get("EVAL_LLM_API_KEY", "")
    if not base_url or not api_key:
        raise RuntimeError("rubric grading requires EVAL_LLM_BASE_URL and EVAL_LLM_API_KEY")

    prompt = JUDGE_PROMPT.format(
        scenario_input=json.dumps(scenario_input, indent=2),
        actual=json.dumps(actual, indent=2),
        criteria="\n".join(f"- {c}" for c in criteria),
    )
    response = requests.post(
        f"{base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        },
        timeout=timeout,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return bool(json.loads(content)["pass"])
