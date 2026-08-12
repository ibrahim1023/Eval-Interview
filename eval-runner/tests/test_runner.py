"""Runner tests against a fake HTTP endpoint (responses) and a fixture suite."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import responses

from evalinterview.graders import deterministic, rubric
from evalinterview.loader import load_config, load_rubrics, load_scenarios
from evalinterview.runner import run_suite

FIXTURES = Path(__file__).parent / "fixtures" / "suite"
TARGET = "http://agent-under-test.local/act"


def test_load_config():
    config = load_config(FIXTURES)
    assert config.agent_name == "Refund Copilot"
    assert config.target_endpoint == TARGET


def test_load_scenarios_reads_all_types():
    scenarios = load_scenarios(FIXTURES)
    # files load in filename order: boundary.yaml before normal.yaml
    assert [s.id for s in scenarios] == ["boundary_block", "normal_ok"]
    by_id = {s.id: s for s in scenarios}
    assert by_id["normal_ok"].grader == "deterministic"
    assert by_id["boundary_block"].grader == "rubric"
    assert by_id["boundary_block"].covers == ["rule-1"]


def test_load_rubrics_from_exported_graders():
    rubrics = load_rubrics(FIXTURES)
    assert rubrics["boundary_block"].criteria == ["The response blocks the refund"]


def test_deterministic_grading():
    assert deterministic({"action": "block"}, {"action": "block"})
    assert not deterministic({"action": "approve"}, {"action": "block"})


@responses.activate
def test_run_suite_pass_and_fail():
    scenario = {s.id: s for s in load_scenarios(FIXTURES)}["normal_ok"]
    config = load_config(FIXTURES)
    responses.post(TARGET, json={"action": "approve"})
    responses.post(TARGET, json={"action": "deny"})

    results = run_suite([scenario], config)
    assert results[0].passed is True

    results = run_suite([scenario], config)
    assert results[0].passed is False
    assert results[0].rule_ids == ["rule-1"]


@responses.activate
def test_rubric_scenario_uses_llm_judge(monkeypatch):
    scenario = {s.id: s for s in load_scenarios(FIXTURES)}["boundary_block"]
    config = load_config(FIXTURES)
    rubrics = load_rubrics(FIXTURES)
    monkeypatch.setenv("EVAL_LLM_BASE_URL", "http://judge.local/v1")
    monkeypatch.setenv("EVAL_LLM_API_KEY", "test")

    responses.post(TARGET, json={"action": "block", "reason": "older than 30 days"})
    responses.post(
        "http://judge.local/v1/chat/completions",
        json={"choices": [{"message": {"content": json.dumps({"pass": True})}}]},
    )

    results = run_suite([scenario], config, rubrics)
    assert results[0].passed is True


@responses.activate
def test_target_error_is_a_failed_eval_not_a_crash():
    scenario = {s.id: s for s in load_scenarios(FIXTURES)}["normal_ok"]
    config = load_config(FIXTURES)
    responses.post(TARGET, status=500)

    results = run_suite([scenario], config)
    assert results[0].passed is False
    assert results[0].error is not None


def test_rubric_requires_criteria():
    with pytest.raises(ValueError):
        rubric({"action": "x"}, [], {}, model="m")
