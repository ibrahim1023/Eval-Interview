import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { setRuleStatus, updateRule } from "@/lib/rules/repository";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("unresolved") }),
  z.object({ action: z.literal("reopen") }),
  z.object({
    action: z.literal("edit"),
    condition: z.string().min(1),
    expectedBehavior: z.string().min(1),
    exceptions: z.array(z.string()),
    andConfirm: z.boolean().default(false),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const { id, ruleId } = await params;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [rule] = await db
    .select({ id: rules.id })
    .from(rules)
    .where(and(eq(rules.id, ruleId), eq(rules.interviewId, id)));
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const input = parsed.data;
  if (input.action === "edit") {
    const [updated] = await updateRule(ruleId, {
      condition: input.condition,
      expectedBehavior: input.expectedBehavior,
      exceptions: input.exceptions,
      ...(input.andConfirm ? { status: "confirmed" as const } : {}),
    });
    return NextResponse.json(updated);
  }

  const status =
    input.action === "confirm"
      ? "confirmed"
      : input.action === "unresolved"
        ? "unresolved"
        : "provisional";
  const [updated] = await setRuleStatus(ruleId, status);
  return NextResponse.json(updated);
}
