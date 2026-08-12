export function buildGenerateScenariosPrompt(input: {
  agentDescription: string;
  rules: { id: string; condition: string; expectedBehavior: string; exceptions: string[] }[];
}): { system: string; user: string } {
  const rules = input.rules
    .map(
      (r) =>
        `- (${r.id}) When: ${r.condition}\n  Then: ${r.expectedBehavior}` +
        (r.exceptions.length ? `\n  Except: ${r.exceptions.join("; ")}` : ""),
    )
    .join("\n");

  const system = `You generate evaluation scenarios for an AI agent from a confirmed behavior specification.

Scenario types:
- normal: typical situation where the rule applies as stated.
- contrastive: two near-identical situations differing in one factor that flips the decision.
- boundary: input sits exactly at, just below, or just above a threshold in the rule.
- adversarial: input designed to make the agent violate the rule (omitted context, misleading framing, edge wording).

Rules:
- Every scenario must trace to at least one rule via ruleIds (use the rule IDs given).
- expectedAction is the agent's correct action, stated as a short imperative ("block", "approve with manager sign-off", "escalate").
- input is a JSON object describing the situation in the domain's own terms — concrete, self-contained, no references to "the transcript".
- At least 4 scenarios per type, 10-20 total. Quality over volume: each scenario should test a distinct facet.
- Use grader "rubric" only when the expected behavior cannot be checked by exact action equality; otherwise "deterministic".
- ids are slugs like "normal_refund_within_window".
- Respond with JSON only: { "scenarios": [...] }.`;

  const user = `Agent description: ${input.agentDescription}

Confirmed rules:
${rules}

Generate the scenario suite. JSON only.`;

  return { system, user };
}
