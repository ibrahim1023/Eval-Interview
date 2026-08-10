"""Grader implementations for exported eval scenarios."""

from __future__ import annotations

from typing import Any


def deterministic(actual: dict[str, Any], expected: dict[str, Any]) -> bool:
    """Compare structured action equality."""
    return actual.get("action") == expected.get("action")


def rubric(actual: dict[str, Any], criteria: list[str]) -> bool:
    """Placeholder for rubric grading.

    The real implementation will call the configured LLM provider with the
    scenario output and criteria list. For now this is a stub that always
    returns True when criteria are provided.
    """
    # TODO(phase-3): implement LLM rubric call
    return bool(criteria)
