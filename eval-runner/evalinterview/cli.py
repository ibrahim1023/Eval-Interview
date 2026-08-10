"""Command-line interface for the EvalInterview eval runner."""

from __future__ import annotations

from pathlib import Path

import click

from .loader import load_config, load_scenarios
from .runner import run_suite


@click.command()
@click.argument("suite_dir", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--verbose", "-v", is_flag=True, help="Show details for every eval.")
def main(suite_dir: Path, verbose: bool) -> None:
    """Run an exported EvalInterview suite against an HTTP agent."""
    config = load_config(suite_dir)
    scenarios = load_scenarios(suite_dir)

    click.echo(config.agent_name)
    click.echo()

    results = run_suite(scenarios, config)
    passed = sum(1 for r in results if r.passed)
    total = len(results)

    click.echo(f"{passed} / {total} passed")
    click.echo()

    failures = [r for r in results if not r.passed]
    for failure in failures:
        click.echo(f"FAIL {failure.scenario_id}")
        click.echo(f"Scenario:  {failure.scenario_id}")
        click.echo(f"Expected:  {failure.expected}")
        click.echo(f"Actual:    {failure.actual}")
        click.echo(f"Rules:     {', '.join(failure.rule_ids)}")
        click.echo()

    if verbose:
        for result in results:
            status = "PASS" if result.passed else "FAIL"
            click.echo(f"{status} {result.scenario_id}")

    raise SystemExit(0 if not failures else 1)
