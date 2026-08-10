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
    .map((r) => `- [${r.status}] ${r.condition} → ${r.expectedBehavior}`)
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

Rules:
- Exactly one question. Conversational, short, spoken aloud by a voice agent.
- Never fabricate rules or evidence.
- Respond with JSON only: { "question": "...", "rationale": "...", "strategy": "conflict|probe|gap|contrastive|boundary|wrap_up" }.

Example:
Evidence classification: PARTIAL — expert said destructive migrations need a rollback plan; handbook also requires a verified backup.
Output: { "question": "The engineering handbook also requires a verified backup for destructive migrations. Should the agent require both a rollback plan and a backup before approving?", "rationale": "Resolve PARTIAL conflict between expert statement and handbook.", "strategy": "conflict" }

Example:
Expert said: "We usually allow that."
Output: { "question": "What would make you reject it instead?", "rationale": "The word 'usually' hides exceptions; probe for the boundary.", "strategy": "probe" }`;

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
