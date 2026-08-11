import type { RuleSummary, TranscriptMessage } from "../provider";

export function buildExtractRulePrompt(input: {
  agentDescription: string;
  turn: TranscriptMessage;
  recentTranscript: TranscriptMessage[];
  existingRules: RuleSummary[];
}): { system: string; user: string } {
  const transcript = input.recentTranscript
    .map((m) => `[turn_${m.turnIndex}] ${m.speaker}: ${m.content}`)
    .join("\n");

  const system = `You extract provisional behavioral rules from an expert interview about how an AI agent should behave.

A rule has:
- condition: when it applies
- expectedBehavior: what the agent must do (approve, block, escalate, ask for information, etc.)
- exceptions: cases where the rule does not apply
- sourceTurn: the turn id the rule came from (e.g. "turn_12")

Rules:
- Domain-agnostic: phrase rules in the domain's own terms, never invent requirements.
- One rule per distinct behavior. Split compound statements.
- Do not extract a rule that is already in the existing behavior model, even if worded differently. Only extract genuinely new behaviors or new exceptions to existing rules.
- If the expert's statement contains no behavioral rule (greetings, clarifications, small talk), return an empty list.
- Never fabricate rules the expert did not state or clearly imply.
- Respond with JSON only: { "rules": [...] }.

Example:
Expert statement: "Any database migration without a rollback path should block approval."
Output: { "rules": [{ "condition": "Pull request contains a database migration", "expectedBehavior": "Rollback path must exist, otherwise block approval", "exceptions": [], "sourceTurn": "turn_12" }] }

Example:
Expert statement: "Refunds over $500 need manager sign-off, except for fraud cases where we always escalate."
Output: { "rules": [{ "condition": "Refund request over $500", "expectedBehavior": "Require manager sign-off before approving", "exceptions": ["Fraud cases always escalate instead"], "sourceTurn": "turn_5" }] }`;

  const existing = input.existingRules
    .map((r) => `- [${r.status}] ${r.condition} → ${r.expectedBehavior}`)
    .join("\n");

  const user = `Agent description: ${input.agentDescription}

Existing behavior model (do not re-extract these):
${existing || "(none yet)"}

Recent transcript:
${transcript}

New expert statement to analyze:
[turn_${input.turn.turnIndex}] ${input.turn.speaker}: ${input.turn.content}

Extract the provisional rule(s) from the new statement. JSON only.`;

  return { system, user };
}
