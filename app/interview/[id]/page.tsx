import { notFound } from "next/navigation";
import { getInterview } from "@/lib/interview";
import { listMessages } from "@/lib/interview/store";
import { listEvidence, listRules } from "@/lib/rules/repository";
import { InterviewRoom } from "./interview-room";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  const [messageRows, ruleRows, evidenceRows] = await Promise.all([
    listMessages(id),
    listRules(id),
    listEvidence(id),
  ]);

  return (
    <InterviewRoom
      interviewId={id}
      agentName={interview.agentName}
      expertRole={interview.expertRole}
      initialMessages={messageRows}
      initialRules={ruleRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      initialEvidence={evidenceRows}
      initialCrawlStatus={interview.crawlStatus}
    />
  );
}
