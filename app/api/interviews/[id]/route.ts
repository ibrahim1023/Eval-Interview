import { NextResponse } from "next/server";
import { getInterview } from "@/lib/interview";
import { listMessages } from "@/lib/interview/store";
import { listEvidence, listRules } from "@/lib/rules/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const [messageRows, ruleRows, evidenceRows] = await Promise.all([
    listMessages(id),
    listRules(id),
    listEvidence(id),
  ]);

  return NextResponse.json({
    interview,
    messages: messageRows,
    rules: ruleRows,
    evidence: evidenceRows,
  });
}
