import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviews, messages } from "@/lib/db/schema";

export type InterviewRow = typeof interviews.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;

export async function createInterview(input: {
  agentName: string;
  agentDescription: string;
  expertRole: string;
  knowledgeSource: { url: string };
}): Promise<InterviewRow> {
  const [row] = await db
    .insert(interviews)
    .values({
      agentName: input.agentName,
      agentDescription: input.agentDescription,
      expertRole: input.expertRole,
      knowledgeSource: input.knowledgeSource,
    })
    .returning();
  return row;
}

export async function getInterview(id: string): Promise<InterviewRow | undefined> {
  const rows = await db.select().from(interviews).where(eq(interviews.id, id));
  return rows[0];
}

export async function setInterviewStatus(
  id: string,
  status: "active" | "review" | "complete",
): Promise<InterviewRow[]> {
  return db
    .update(interviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(interviews.id, id))
    .returning();
}

export async function addMessage(input: {
  interviewId: string;
  speaker: "expert" | "interviewer";
  content: string;
}): Promise<MessageRow> {
  const [row] = await db
    .insert(messages)
    .values({
      interviewId: input.interviewId,
      speaker: input.speaker,
      content: input.content,
      turnIndex: sql`(select coalesce(max(turn_index) + 1, 0) from ${messages} where interview_id = ${input.interviewId})`,
    })
    .returning();
  return row;
}

export function listMessages(interviewId: string): Promise<MessageRow[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.interviewId, interviewId))
    .orderBy(messages.turnIndex);
}

export async function recentMessages(
  interviewId: string,
  count: number,
): Promise<MessageRow[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.interviewId, interviewId))
    .orderBy(desc(messages.turnIndex))
    .limit(count);
  return rows.reverse();
}
