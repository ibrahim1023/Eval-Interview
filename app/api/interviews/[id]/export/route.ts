import { NextResponse } from "next/server";
import { getInterview } from "@/lib/interview";
import { listEvidence, listRules } from "@/lib/rules/repository";
import { listScenarios } from "@/lib/evals/store";
import { buildEvalSuiteZip } from "@/lib/evals/exporter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const [rules, evidence, scenarios] = await Promise.all([
    listRules(id),
    listEvidence(id),
    listScenarios(id),
  ]);
  if (scenarios.length === 0) {
    return NextResponse.json(
      { error: "No scenarios generated yet — generate the eval suite first" },
      { status: 409 },
    );
  }

  const zip = await buildEvalSuiteZip({ interview, rules, evidence, scenarios });
  const name = `${interview.agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-evals.zip`;
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
