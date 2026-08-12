import type { GeneratedScenario } from "../provider";

export function buildGenerateRubricPrompt(input: {
  scenario: GeneratedScenario;
  ruleCondition: string;
  expectedBehavior: string;
}): { system: string; user: string } {
  const system = `You write grading rubrics for behavioral eval scenarios. A grader LLM will judge an agent's response against your criteria.

Rules:
- 3-6 criteria, each a single checkable sentence ("The response cites the 30-day limit as the reason for denial").
- Criteria must be objective and observable in the response — no speculation about intent.
- Derived only from the rule and scenario given. Never invent requirements.
- Respond with JSON only: { "criteria": [...] }.`;

  const user = `Rule: When ${input.ruleCondition} → ${input.expectedBehavior}

Scenario (${input.scenario.type}):
input: ${JSON.stringify(input.scenario.input)}
expected action: ${input.scenario.expectedAction}

Write the rubric criteria. JSON only.`;

  return { system, user };
}
