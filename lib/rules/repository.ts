import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { evidence, rules } from "@/lib/db/schema";
import type { ProvisionalRule } from "@/lib/intelligence/provider";
import type { RuleStatus } from "./model";

export type RuleRow = typeof rules.$inferSelect;
export type EvidenceRow = typeof evidence.$inferSelect;

export function createRule(
  interviewId: string,
  rule: ProvisionalRule,
): Promise<RuleRow[]> {
  return db
    .insert(rules)
    .values({
      interviewId,
      condition: rule.condition,
      expectedBehavior: rule.expectedBehavior,
      exceptions: rule.exceptions,
      interviewSources: [rule.sourceTurn],
      status: "provisional",
    })
    .returning();
}

export function listRules(interviewId: string): Promise<RuleRow[]> {
  return db.select().from(rules).where(eq(rules.interviewId, interviewId));
}

export function setRuleStatus(id: string, status: RuleStatus): Promise<RuleRow[]> {
  return db
    .update(rules)
    .set({ status, updatedAt: new Date() })
    .where(eq(rules.id, id))
    .returning();
}

export async function attachContextSource(id: string, source: string): Promise<void> {
  const rows = await db
    .select({ contextSources: rules.contextSources })
    .from(rules)
    .where(eq(rules.id, id));
  const current = rows[0]?.contextSources ?? [];
  if (current.includes(source)) return;
  await db
    .update(rules)
    .set({ contextSources: [...current, source], updatedAt: new Date() })
    .where(eq(rules.id, id));
}

export function updateRule(
  id: string,
  patch: Partial<{
    condition: string;
    expectedBehavior: string;
    exceptions: string[];
    status: RuleStatus;
    interviewSources: string[];
    contextSources: string[];
  }>,
): Promise<RuleRow[]> {
  return db
    .update(rules)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(rules.id, id))
    .returning();
}

export function addEvidence(input: {
  interviewId: string;
  ruleId?: string;
  source: string;
  content: string;
  relationship: "supported" | "conflict" | "partial" | "new_area";
}): Promise<EvidenceRow[]> {
  return db
    .insert(evidence)
    .values({
      interviewId: input.interviewId,
      ruleId: input.ruleId ?? null,
      source: input.source,
      content: input.content,
      relationship: input.relationship,
    })
    .returning();
}

export function listEvidence(interviewId: string): Promise<EvidenceRow[]> {
  return db.select().from(evidence).where(eq(evidence.interviewId, interviewId));
}
