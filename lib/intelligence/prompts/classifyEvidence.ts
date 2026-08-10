import type { EvidenceInput, ProvisionalRule } from "../provider";

export function buildClassifyEvidencePrompt(input: {
  rule: ProvisionalRule;
  evidence: EvidenceInput[];
}): { system: string; user: string } {
  const chunks = input.evidence
    .map((e, i) => `[chunk_${i}] source: ${e.source} — ${e.title}\n${e.content}`)
    .join("\n\n");

  const system = `You compare a provisional behavioral rule (stated by a domain expert) against retrieved organizational knowledge.

Classify the relationship between the evidence and the rule as exactly one of:
- SUPPORTED: the evidence clearly agrees with the expert's rule
- CONFLICT: the evidence contradicts the expert's rule (different requirements, thresholds, or outcomes)
- PARTIAL: the evidence agrees with part of the rule but adds, omits, or qualifies something
- NO_EVIDENCE: the retrieved chunks say nothing relevant to the rule
- NEW_RELATED_AREA: the evidence is about a related topic the rule does not cover at all

Rules:
- Be strict about CONFLICT: only use it for genuine contradictions, not additions (those are PARTIAL).
- Never decide which source is correct — just classify the relationship.
- relevantChunks lists the chunk ids (e.g. "chunk_0") that drove the classification.
- Respond with JSON only: { "classification": "...", "rationale": "...", "relevantChunks": [...] }.

Example:
Rule: "Destructive migrations require a rollback plan, otherwise block."
Evidence: "Engineering handbook: Destructive migrations require a rollback plan and a verified backup."
Output: { "classification": "PARTIAL", "rationale": "The handbook agrees on the rollback plan but adds a verified backup requirement the expert did not mention.", "relevantChunks": ["chunk_0"] }`;

  const user = `Rule:
condition: ${input.rule.condition}
expectedBehavior: ${input.rule.expectedBehavior}
exceptions: ${input.rule.exceptions.length ? input.rule.exceptions.join("; ") : "none"}

Retrieved evidence:
${chunks || "(no evidence retrieved)"}

Classify the evidence. JSON only.`;

  return { system, user };
}
