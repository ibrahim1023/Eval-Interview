import type { IntelligenceProvider, GeneratedScenario } from "@/lib/intelligence/provider";
import type { RuleRow } from "@/lib/rules/repository";
import { replaceScenarios } from "./store";

/**
 * Generate the eval suite for an interview from its confirmed rules, then
 * persist it. Rubric-graded scenarios get their criteria generated here too,
 * so export is a pure read.
 */
export async function generateSuite(
  intelligence: IntelligenceProvider,
  interview: { id: string; agentDescription: string },
  rules: RuleRow[],
): Promise<{ scenarioCount: number }> {
  const confirmed = rules.filter((r) => r.status === "confirmed");
  if (confirmed.length === 0) return { scenarioCount: 0 };

  const { scenarios } = await intelligence.generateScenarios({
    agentDescription: interview.agentDescription,
    rules: confirmed.map((r) => ({
      id: r.id,
      condition: r.condition,
      expectedBehavior: r.expectedBehavior,
      exceptions: r.exceptions,
    })),
  });

  const withCriteria: (GeneratedScenario & { criteria: string[] })[] = await Promise.all(
    scenarios.map(async (s) => {
      if (s.grader !== "rubric") return { ...s, criteria: [] };
      const rule = confirmed.find((r) => r.id === s.ruleIds[0]) ?? confirmed[0];
      const { criteria } = await intelligence.generateRubric({
        scenario: s,
        ruleCondition: rule.condition,
        expectedBehavior: rule.expectedBehavior,
      });
      return { ...s, criteria };
    }),
  );

  await replaceScenarios(interview.id, withCriteria);
  return { scenarioCount: withCriteria.length };
}
