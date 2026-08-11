import type { RuleSummary, TranscriptMessage } from "../provider";

export function buildFollowUpPrompt(input: {
  transcript: TranscriptMessage[];
  behaviorModel: RuleSummary[];
  evidenceClassifications: {
    ruleCondition: string;
    classification: string;
    rationale: string;
  }[];
  coverageGaps: string[];
}): { system: string; user: string } {
  const transcript = input.transcript
    .map((m) => `[turn_${m.turnIndex}] ${m.speaker}: ${m.content}`)
    .join("\n");

  const rules = input.behaviorModel
    .map((r) => `- [${r.status}] (${r.id}) ${r.condition} → ${r.expectedBehavior}`)
    .join("\n");

  const evidence = input.evidenceClassifications
    .map((e) => `- ${e.classification}: ${e.ruleCondition} (${e.rationale})`)
    .join("\n");

  const gaps = input.coverageGaps.map((g) => `- ${g}`).join("\n");

  const system = `You are the strategist behind an adaptive interview that extracts behavioral rules from a domain expert. You produce ONE next question for the interviewer to ask.

Priorities, in order:
1. conflict — if any evidence classification is CONFLICT or PARTIAL, ask the expert to resolve it. Quote the source. Never silently decide which side is right.
2. probe — if the last expert answer was vague ("usually", "sometimes", "large"), ask for the threshold, exception, or decision boundary.
3. gap — if coverage gaps exist and no conflict is open, ask about the most important uncovered topic, referencing that the knowledge base mentions it.
4. contrastive — propose two closely related scenarios differing in one factor and ask which way the agent should decide, to surface hidden distinctions.
5. boundary — if a numeric threshold was mentioned, probe around it (just below, at, just above).
6. wrap_up — only when rules are well covered and no conflicts/gaps remain; ask a closing question inviting anything missed.

Knowing when to move on is as important as probing:
- Never ask about the same sticking point more than twice. If the expert has failed or declined to resolve a conflict after two attempts, or asks to move on, stop asking about it: list its rule ID in abandonRuleIds and pick a question from a lower priority.
- Distinguish vagueness from uncertainty. "Usually" hides a boundary — probe it. "I'm not sure", "no idea", "maybe" means the organization lacks an answer — do NOT probe deeper; list any related rule ID in abandonRuleIds and move to a different topic. Unresolved items are a valid and valuable interview outcome.
- If the expert explicitly asks to skip a topic, respect it immediately.

Rules:
- Exactly one question. Conversational, short, spoken aloud by a voice agent.
- Never fabricate rules or evidence.
- Respond with JSON only: { "question": "...", "rationale": "...", "strategy": "conflict|probe|gap|contrastive|boundary|wrap_up", "abandonRuleIds": [] }.

Example:
Evidence classification: PARTIAL — expert said destructive migrations need a rollback plan; handbook also requires a verified backup.
Output: { "question": "The engineering handbook also requires a verified backup for destructive migrations. Should the agent require both a rollback plan and a backup before approving?", "rationale": "Resolve PARTIAL conflict between expert statement and handbook.", "strategy": "conflict" }

Example:
Expert said: "We usually allow that."
Output: { "question": "What would make you reject it instead?", "rationale": "The word 'usually' hides exceptions; probe for the boundary.", "strategy": "probe", "abandonRuleIds": [] }

Example:
Expert said "I'm not sure, maybe" when asked to resolve a conflict for the second time about rule rule_123.
Output: { "question": "No problem, we'll mark that as open. The handbook mentions refund abuse patterns — should the agent watch for those?", "rationale": "Expert disclaimed knowledge twice; record rule_123 unresolved and move to a coverage gap.", "strategy": "gap", "abandonRuleIds": ["rule_123"] }`;

  const user = `Transcript so far:
${transcript || "(empty)"}

Current behavior model:
${rules || "(no rules yet)"}

Evidence classifications:
${evidence || "(none yet)"}

Coverage gaps from organizational knowledge:
${gaps || "(none)"}

Produce the one next question. JSON only.`;

  return { system, user };
}
