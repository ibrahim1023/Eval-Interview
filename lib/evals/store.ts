import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scenarios } from "@/lib/db/schema";
import type { GeneratedScenario } from "@/lib/intelligence/provider";

export type ScenarioRow = typeof scenarios.$inferSelect;

export async function replaceScenarios(
  interviewId: string,
  generated: (GeneratedScenario & { criteria: string[] })[],
): Promise<ScenarioRow[]> {
  await db.delete(scenarios).where(eq(scenarios.interviewId, interviewId));
  if (generated.length === 0) return [];
  return db
    .insert(scenarios)
    .values(
      generated.map((s) => ({
        interviewId,
        type: s.type,
        slug: s.id,
        input: s.input,
        expectedBehavior: s.expectedAction,
        grader: s.grader,
        criteria: s.criteria,
        ruleIds: s.ruleIds,
      })),
    )
    .returning();
}

export function listScenarios(interviewId: string): Promise<ScenarioRow[]> {
  return db.select().from(scenarios).where(eq(scenarios.interviewId, interviewId));
}
