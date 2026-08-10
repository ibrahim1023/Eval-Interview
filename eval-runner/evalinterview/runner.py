"""Execute eval scenarios against an HTTP target."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from .graders import deterministic, rubric
from .loader import Scenario, SuiteConfig


@dataclass
class EvalResult:
    scenario_id: str
    passed: bool
    actual: dict[str, Any]
    expected: dict[str, Any]
    rule_ids: list[str]


def run_scenario(scenario: Scenario, config: SuiteConfig, timeout: int = 30) -> EvalResult:
    response = requests.post(
        config.target_endpoint,
        json={"input": scenario.input},
        timeout=timeout,
    )
    response.raise_for_status()
    actual = response.json()

    if scenario.grader == "rubric":
        passed = rubric(actual, [])  # TODO(phase-3): load criteria from graders
    else:
        passed = deterministic(actual, scenario.expected)

    return EvalResult(
        scenario_id=scenario.id,
        passed=passed,
        actual=actual,
        expected=scenario.expected,
        rule_ids=scenario.covers,
    )


def run_suite(scenarios: list[Scenario], config: SuiteConfig) -> list[EvalResult]:
    return [run_scenario(s, config) for s in scenarios]
