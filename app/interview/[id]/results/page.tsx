import { notFound } from "next/navigation";
import { getInterview } from "@/lib/interview";
import { listRules } from "@/lib/rules/repository";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  const ruleRows = await listRules(id);
  const counts = {
    confirmed: ruleRows.filter((r) => r.status === "confirmed").length,
    conflict: ruleRows.filter((r) => r.status === "conflict").length,
    unresolved: ruleRows.filter((r) => r.status === "unresolved").length,
    provisional: ruleRows.filter((r) => r.status === "provisional").length,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3.5">
        <span className="text-[15px] font-semibold tracking-tight">EvalInterview</span>
        <span className="text-[13px] text-neutral-500">{interview.agentName} · interview complete</span>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-10 pb-24">
        <h1 className="text-2xl font-semibold tracking-tight">Behavior specification</h1>
        <p className="mt-1.5 text-sm text-neutral-600">
          Review and confirm the rules extracted from the interview. Rule editing,
          scenario generation, and export arrive in Phase 3.
        </p>

        <div className="my-6 flex gap-3">
          {Object.entries(counts).map(([label, n]) => (
            <div key={label} className="flex-1 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-2xl font-semibold">{n}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
            </div>
          ))}
        </div>

        {ruleRows.map((r) => (
          <div key={r.id} className="mb-3 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold">{r.condition}</div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                {r.status}
              </span>
            </div>
            <div className="mt-2 text-[13.5px] leading-relaxed text-neutral-700">
              {r.expectedBehavior}
            </div>
            {r.exceptions.length > 0 && (
              <div className="mt-2 text-[13px] text-neutral-500">
                Exceptions: {r.exceptions.join("; ")}
              </div>
            )}
            <div className="mt-3 border-t border-dashed border-neutral-200 pt-3 font-mono text-xs text-neutral-500">
              evidence: {[...r.interviewSources, ...r.contextSources].join(" · ") || "none"}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
