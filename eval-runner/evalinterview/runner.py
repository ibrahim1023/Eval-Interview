"""Execute eval scenarios against an HTTP target."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import requests

from .graders import deterministic, rubric
from .loader import Rubric, Scenario, SuiteConfig


@dataclass
class EvalResult:
    scenario_id: str
    passed: bool
    actual: dict[str, Any]
    expected: dict[str, Any]
    rule_ids: list[str]
    error: str | None = None


def run_scenario(
    scenario: Scenario,
    config: SuiteConfig,
    rubrics: dict[str, Rubric] | None = None,
    timeout: int = 30,
) -> EvalResult:
    expected = scenario.expected
    actual: dict[str, Any] = {}
    error: str | None = None
    passed = False

    try:
        # yaml.safe_load turns unquoted ISO dates into datetime.date; serialize
        # them back to strings so the JSON body never crashes.
        response = requests.post(
            config.target_endpoint,
            data=json.dumps({"input": scenario.input}, default=str),
            headers={"Content-Type": "application/json"},
            timeout=timeout,
        )
        response.raise_for_status()
        actual = response.json()

        if scenario.grader == "rubric":
            criteria = (rubrics or {}).get(scenario.id)
            if criteria is None:
                raise RuntimeError(f"no rubric criteria found for scenario {scenario.id}")
            passed = rubric(actual, criteria.criteria, scenario.input,
                            model=config.rubric_model or "")
        else:
            passed = deterministic(actual, expected)
    except Exception as exc:  # a broken target or judge is a failed eval, not a crash
        error = str(exc)

    return EvalResult(
        scenario_id=scenario.id,
        passed=passed,
        actual=actual,
        expected=expected,
        rule_ids=scenario.covers,
        error=error,
    )


def run_suite(
    scenarios: list[Scenario],
    config: SuiteConfig,
    rubrics: dict[str, Rubric] | None = None,
) -> list[EvalResult]:
    return [run_scenario(s, config, rubrics) for s in scenarios]
