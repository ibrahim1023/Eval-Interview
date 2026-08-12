import { notFound } from "next/navigation";
import { getInterview } from "@/lib/interview";
import { listEvidence, listRules } from "@/lib/rules/repository";
import { ReviewDocument } from "./review-document";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  const [ruleRows, evidenceRows] = await Promise.all([listRules(id), listEvidence(id)]);

  return (
    <ReviewDocument
      interviewId={id}
      agentName={interview.agentName}
      expertRole={interview.expertRole}
      rules={ruleRows}
      evidence={evidenceRows}
    />
  );
}
