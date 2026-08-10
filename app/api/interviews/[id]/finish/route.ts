import { NextResponse } from "next/server";
import { getInterview, setInterviewStatus } from "@/lib/interview";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const [updated] = await setInterviewStatus(id, "review");
  return NextResponse.json({ interview: updated });
}
