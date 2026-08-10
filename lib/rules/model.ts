import type { EvidenceClassification } from "@/lib/intelligence/provider";

export type RuleStatus = "provisional" | "confirmed" | "conflict" | "unresolved";

const VALID_TRANSITIONS: Record<RuleStatus, RuleStatus[]> = {
  provisional: ["confirmed", "conflict", "unresolved"],
  conflict: ["confirmed", "unresolved"],
  unresolved: ["confirmed"],
  confirmed: [],
};

export function canTransition(from: RuleStatus, to: RuleStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Map an evidence classification onto a rule status change, or null when the
 * rule keeps its current status. Evidence never auto-confirms and never marks
 * unresolved — both of those are expert decisions made in review.
 */
export function reconcileStatus(
  classification: EvidenceClassification["classification"],
): RuleStatus | null {
  if (classification === "CONFLICT" || classification === "PARTIAL") return "conflict";
  return null;
}
