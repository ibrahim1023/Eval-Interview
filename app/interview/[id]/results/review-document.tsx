"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Rule = {
  id: string;
  condition: string;
  expectedBehavior: string;
  exceptions: string[];
  status: "provisional" | "confirmed" | "conflict" | "unresolved";
  interviewSources: string[];
  contextSources: string[];
};

type Evidence = {
  id: string;
  ruleId: string | null;
  source: string;
  content: string;
  relationship: "supported" | "conflict" | "partial" | "new_area";
};

type Scenario = {
  id: string;
  type: "normal" | "contrastive" | "boundary" | "adversarial";
};

const STAMP: Record<Rule["status"], { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "text-green-700 border-green-700" },
  provisional: { label: "Provisional", className: "text-neutral-400 border-neutral-400" },
  conflict: { label: "Conflict", className: "text-orange-700 border-orange-700" },
  unresolved: { label: "Unresolved", className: "text-violet-700 border-violet-700" },
};

export function ReviewDocument(props: {
  interviewId: string;
  agentName: string;
  expertRole: string;
  rules: Rule[];
  evidence: Evidence[];
  scenarios: Scenario[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const reviewed = props.rules.filter((r) => r.status !== "provisional").length;
  const openConflicts = props.rules.filter((r) => r.status === "conflict").length;
  const confirmedCount = props.rules.filter((r) => r.status === "confirmed").length;
  const exportReady = openConflicts === 0 && props.scenarios.length > 0;

  async function generate() {
    setGenerating(true);
    try {
      await fetch(`/api/interviews/${props.interviewId}/generate`, { method: "POST" });
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function act(ruleId: string, body: Record<string, unknown>) {
    setBusyId(ruleId);
    try {
      const res = await fetch(`/api/interviews/${props.interviewId}/rules/${ruleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-neutral-900">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-paper px-7 py-3.5">
        <span className="text-[15px] font-semibold tracking-tight">EvalInterview</span>
        <span className="text-[13px] text-neutral-400">
          {reviewed} of {props.rules.length} sections reviewed
        </span>
        {exportReady ? (
          <a
            href={`/api/interviews/${props.interviewId}/export`}
            className="rounded-lg bg-signal px-4 py-2.5 text-[13.5px] font-medium text-white"
          >
            Export eval suite
          </a>
        ) : (
          <button
            disabled
            title="Resolve all conflicts and generate the suite to enable export"
            className="cursor-not-allowed rounded-lg bg-neutral-300 px-4 py-2.5 text-[13.5px] font-medium text-white"
          >
            Export eval suite
          </button>
        )}
      </nav>

      <div className="mx-auto max-w-[680px] px-7 pt-14 pb-28">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-neutral-400 uppercase">
          Behavior specification · review draft
        </div>
        <h1 className="mt-2 font-serif text-[34px] font-bold tracking-tight">{props.agentName}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Interviewed: {props.expertRole} · knowledge:{" "}
          {props.evidence[0]?.source ?? "none retrieved"}
        </p>
        <div className="mt-2 mb-10 border-b border-hairline pb-6 font-mono text-xs text-neutral-400">
          spec_version: 1 · status: review
        </div>

        {props.rules.map((rule, i) => (
          <Section
            key={rule.id}
            index={i + 1}
            rule={rule}
            evidence={props.evidence.filter(
              (e) => e.ruleId === rule.id && (e.relationship === "conflict" || e.relationship === "partial"),
            )}
            editing={editingId === rule.id}
            busy={busyId === rule.id}
            onEdit={() => setEditingId(rule.id)}
            onCancel={() => setEditingId(null)}
            onAct={act}
          />
        ))}

        <div className="mt-14 border-t-2 border-neutral-900 pt-8">
          <h2 className="font-serif text-[22px] font-bold">Eval suite</h2>
          <p className="mt-1.5 mb-6 text-[13.5px] text-neutral-500">
            Generated from confirmed sections only. Conflicts and unresolved sections are excluded
            until decided.
          </p>
          {props.scenarios.length > 0 && (
            <div className="mb-6 flex gap-5 font-mono text-[12.5px] text-neutral-500">
              {(["normal", "contrastive", "boundary", "adversarial"] as const).map((t) => (
                <span key={t}>
                  <strong className="text-neutral-900">
                    {props.scenarios.filter((s) => s.type === t).length}
                  </strong>{" "}
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={generate}
              disabled={generating || confirmedCount === 0}
              className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {generating
                ? "Generating…"
                : props.scenarios.length > 0
                  ? "Regenerate eval suite"
                  : "Generate eval suite"}
            </button>
            {!exportReady && openConflicts > 0 && (
              <span className="text-xs text-orange-700">
                ⚠ {openConflicts} open conflict{openConflicts === 1 ? "" : "s"} — resolve or leave
                unresolved to enable export.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section(props: {
  index: number;
  rule: Rule;
  evidence: Evidence[];
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onAct: (ruleId: string, body: Record<string, unknown>) => void;
}) {
  const { rule } = props;
  const stamp = STAMP[rule.status];
  const provenance = [...rule.interviewSources, ...rule.contextSources].join(" · ") || "none";

  return (
    <section className="relative border-b border-hairline py-7">
      <div className="flex items-baseline gap-3.5">
        <span className="font-serif text-[17px] text-neutral-400">§{props.index}</span>
        <h3 className="flex-1 font-serif text-xl font-bold">{rule.condition}</h3>
        <span
          className={`rotate-[-2deg] rounded border-[1.5px] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.1em] uppercase ${stamp.className}`}
        >
          {stamp.label}
        </span>
      </div>

      {props.editing ? (
        <EditForm rule={rule} busy={props.busy} onCancel={props.onCancel} onAct={props.onAct} />
      ) : (
        <>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-neutral-600">
              {rule.expectedBehavior}
          </p>
          {rule.exceptions.length > 0 && (
            <p className="mt-2 text-[13.5px] text-neutral-500">
              Except: {rule.exceptions.join("; ")}
            </p>
          )}
        </>
      )}

      {rule.status === "conflict" && props.evidence.length > 0 && (
        <div className="mt-3.5 rounded-[10px] border border-orange-200 bg-orange-50 p-4">
          <div className="text-[13px] font-semibold text-orange-900">
            Contradicts the knowledge source
          </div>
          <blockquote className="mt-2 border-l-[3px] border-orange-700 pl-3.5 text-[13.5px] leading-relaxed text-orange-900 italic">
            “{props.evidence[0].content.slice(0, 280)}”
            <span className="mt-2 block font-mono text-[11.5px] not-italic text-orange-700">
              {props.evidence[0].source}
            </span>
          </blockquote>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <ActionButton
              primary
              disabled={props.busy}
              onClick={() => props.onAct(rule.id, { action: "confirm" })}
              label="Keep expert rule"
              tone="red"
            />
            <ActionButton
              disabled={props.busy}
              onClick={() => props.onAct(rule.id, { action: "unresolved" })}
              label="Leave unresolved"
              tone="red"
            />
            <ActionButton disabled={props.busy} onClick={props.onEdit} label="Edit" tone="red" />
          </div>
        </div>
      )}

      {rule.status === "unresolved" && (
        <div className="mt-3.5 rounded-[10px] border border-violet-200 bg-violet-50 p-3.5 text-[13px] leading-relaxed text-violet-900">
          No clear organizational answer. Excluded from generated evals; kept in the spec for later
          resolution.
        </div>
      )}

      <div className="mt-3 font-mono text-[11.5px] text-neutral-400">{provenance}</div>

      {!props.editing && rule.status !== "conflict" && (
        <div className="mt-3 flex gap-2">
          {rule.status === "unresolved" ? (
            <ActionButton
              disabled={props.busy}
              onClick={() => props.onAct(rule.id, { action: "reopen" })}
              label="Reopen"
            />
          ) : (
            <>
              {rule.status !== "confirmed" && (
                <ActionButton
                  primary
                  disabled={props.busy}
                  onClick={() => props.onAct(rule.id, { action: "confirm" })}
                  label="Confirm"
                />
              )}
              <ActionButton disabled={props.busy} onClick={props.onEdit} label="Edit" />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function EditForm(props: {
  rule: Rule;
  busy: boolean;
  onCancel: () => void;
  onAct: (ruleId: string, body: Record<string, unknown>) => void;
}) {
  const [condition, setCondition] = useState(props.rule.condition);
  const [expectedBehavior, setExpectedBehavior] = useState(props.rule.expectedBehavior);
  const [exceptions, setExceptions] = useState(props.rule.exceptions.join("; "));

  const body = () => ({
    action: "edit",
    condition,
    expectedBehavior,
    exceptions: exceptions
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const field =
    "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13.5px] focus:border-neutral-900 focus:outline-none";

  return (
    <div className="mt-3">
      <label className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        When
        <textarea rows={2} className={field} value={condition} onChange={(e) => setCondition(e.target.value)} />
      </label>
      <label className="mt-3 block text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        Then
        <textarea rows={2} className={field} value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)} />
      </label>
      <label className="mt-3 block text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        Exceptions (separated by semicolons)
        <textarea rows={1} className={field} value={exceptions} onChange={(e) => setExceptions(e.target.value)} />
      </label>
      <div className="mt-3 flex gap-2">
        <ActionButton disabled={props.busy} onClick={props.onCancel} label="Cancel" />
        <ActionButton
          disabled={props.busy}
          onClick={() => props.onAct(props.rule.id, body())}
          label="Save"
        />
        <ActionButton
          primary
          disabled={props.busy}
          onClick={() => props.onAct(props.rule.id, { ...body(), andConfirm: true })}
          label="Save & confirm"
        />
      </div>
    </div>
  );
}

function ActionButton(props: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  tone?: "red";
}) {
  const base = "rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50";
  const styles = props.primary
    ? props.tone === "red"
      ? "bg-orange-700 text-white"
      : "bg-neutral-900 text-white"
    : props.tone === "red"
      ? "border border-orange-200 bg-white text-orange-900"
      : "border border-hairline bg-white text-neutral-600";
  return (
    <button onClick={props.onClick} disabled={props.disabled} className={`${base} ${styles}`}>
      {props.label}
    </button>
  );
}
