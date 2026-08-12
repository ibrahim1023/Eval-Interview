import { NextResponse } from "next/server";
import { getInterview } from "@/lib/interview";
import { createHyperfusionProvider } from "@/lib/intelligence/hyperfusion";
import { listRules } from "@/lib/rules/repository";
import { generateSuite } from "@/lib/evals/generate";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const rules = await listRules(id);
  const result = await generateSuite(
    createHyperfusionProvider(),
    { id, agentDescription: interview.agentDescription },
    rules,
  );
  return NextResponse.json(result);
}
