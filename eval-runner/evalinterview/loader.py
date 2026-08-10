"""Load and validate exported eval suite files."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class SuiteConfig:
    agent_name: str
    target_endpoint: str
    rubric_model: str | None = None


@dataclass
class Scenario:
    id: str
    type: str
    input: dict[str, Any]
    expected: dict[str, Any]
    covers: list[str]
    grader: str = "deterministic"


@dataclass
class Rubric:
    scenario_id: str
    criteria: list[str]


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_config(root: Path) -> SuiteConfig:
    raw = load_yaml(root / "eval_config.yaml")
    agent = raw.get("agent", {})
    target = raw.get("target", {})
    grading = raw.get("grading", {})
    return SuiteConfig(
        agent_name=agent.get("name", "unknown-agent"),
        target_endpoint=target.get("endpoint", ""),
        rubric_model=grading.get("rubric_model"),
    )


def load_scenarios(root: Path) -> list[Scenario]:
    scenarios: list[Scenario] = []
    evals_dir = root / "evals"
    if not evals_dir.exists():
        return scenarios

    for file in sorted(evals_dir.glob("*.yaml")):
        raw = load_yaml(file)
        for item in raw.get("scenarios", []):
            scenarios.append(
                Scenario(
                    id=item["id"],
                    type=item["type"],
                    input=item["input"],
                    expected=item["expected"],
                    covers=item.get("covers", []),
                    grader=item.get("grader", "deterministic"),
                )
            )
    return scenarios


def load_rubrics(root: Path) -> dict[str, Rubric]:
    # Rubrics live in graders/graders.py as RUBRICS dict in Phase 3.
    # For the skeleton we just return an empty mapping.
    return {}
