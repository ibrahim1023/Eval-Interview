"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  turnIndex: number;
  speaker: "expert" | "interviewer";
  content: string;
};

type Rule = {
  id: string;
  condition: string;
  expectedBehavior: string;
  status: "provisional" | "confirmed" | "conflict" | "unresolved";
  contextSources: string[];
};

type Evidence = {
  id: string;
  ruleId: string | null;
  source: string;
  content: string;
  relationship: "supported" | "conflict" | "partial" | "new_area";
};

const STATUS_CHIP: Record<Rule["status"], string> = {
  provisional: "bg-neutral-100 text-neutral-600",
  confirmed: "bg-green-100 text-green-800",
  conflict: "bg-amber-100 text-amber-800",
  unresolved: "bg-violet-100 text-violet-800",
};

export function InterviewRoom(props: {
  interviewId: string;
  agentName: string;
  expertRole: string;
  initialMessages: Message[];
  initialRules: Rule[];
  initialEvidence: Evidence[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(props.initialMessages);
  const [rules, setRules] = useState(props.initialRules);
  const [evidence, setEvidence] = useState(props.initialEvidence);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const supported = evidence.filter((e) => e.relationship === "supported").length;
  const conflicts = evidence.filter((e) => e.relationship === "conflict" || e.relationship === "partial").length;
  const newAreas = evidence.filter((e) => e.relationship === "new_area").length;
  const unresolved = rules.filter((r) => r.status === "unresolved").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/interviews/${props.interviewId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      setRules(data.rules);
      setEvidence(data.evidence);
    }, 2500);
    return () => clearInterval(timer);
  }, [props.interviewId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setInput("");
    try {
      await fetch(`/api/interviews/${props.interviewId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const res = await fetch(`/api/interviews/${props.interviewId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setRules(data.rules);
        setEvidence(data.evidence);
      }
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    await fetch(`/api/interviews/${props.interviewId}/finish`, { method: "POST" });
    router.push(`/interview/${props.interviewId}/results`);
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <nav className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 py-3.5">
        <span className="text-[15px] font-semibold tracking-tight">EvalInterview</span>
        <span className="text-[13px] text-neutral-500">
          {props.agentName} · interviewing {props.expertRole}
        </span>
        <button
          onClick={finish}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[13.5px] font-medium text-white"
        >
          Finish &amp; review
        </button>
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px]">
        <section className="overflow-y-auto px-8 pt-7 pb-32">
          {messages.length === 0 && (
            <p className="mt-8 text-center text-sm text-neutral-400">
              The interview hasn&rsquo;t started. Answer the interviewer&rsquo;s first question below.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`mb-5 max-w-xl ${m.speaker === "expert" ? "ml-auto" : ""}`}>
              <div
                className={`mb-1 text-[11.5px] font-semibold uppercase tracking-wide ${
                  m.speaker === "expert" ? "text-right text-neutral-500" : "text-neutral-900"
                }`}
              >
                {m.speaker === "expert" ? props.expertRole : "EvalInterview"}
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.speaker === "expert"
                    ? "bg-neutral-900 text-neutral-50"
                    : "border border-neutral-200 bg-white"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </section>

        <aside className="overflow-y-auto border-l border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
            Rules discovered
          </h2>
          <div className="mb-6 flex gap-2">
            {[
              { n: rules.length, l: "total", cls: "" },
              { n: supported, l: "supported", cls: "text-green-600" },
              { n: conflicts, l: "conflict", cls: "text-amber-600" },
            ].map((s) => (
              <div
                key={s.l}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center"
              >
                <div className={`text-xl font-semibold ${s.cls}`}>{s.n}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">{s.l}</div>
              </div>
            ))}
          </div>

          {rules.map((r) => (
            <div key={r.id} className="mb-2.5 rounded-xl border border-neutral-200 p-3.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-[13.5px] font-semibold leading-snug">{r.condition}</div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_CHIP[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-xs leading-normal text-neutral-600">{r.expectedBehavior}</div>
            </div>
          ))}

          <h2 className="mt-7 mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
            Context.dev · uncovered areas
          </h2>
          <div className="mb-6 flex gap-2">
            <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
              <div className="text-xl font-semibold text-blue-600">{newAreas}</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">new areas</div>
            </div>
            <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
              <div className="text-xl font-semibold text-violet-600">{unresolved}</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">unresolved</div>
            </div>
          </div>
          {evidence
            .filter((e) => e.relationship === "new_area")
            .map((e) => (
              <div key={e.id} className="flex items-start gap-2 border-b border-neutral-100 py-2 text-[13px] text-neutral-700 last:border-0">
                <span className="font-bold text-blue-600">?</span>
                <span>{e.source}</span>
              </div>
            ))}
        </aside>
      </div>

      <div className="fixed right-[340px] bottom-0 left-0 flex items-center gap-4 border-t border-neutral-200 bg-white px-8 py-4">
        <div className="flex items-center gap-2 text-[13.5px] text-neutral-500">
          <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
          <strong className="font-semibold text-neutral-900">
            {busy ? "Thinking…" : "Listening"}
          </strong>
          — voice arrives in Phase 2; type below for now
        </div>
        <form onSubmit={send} className="flex flex-1 gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Type the expert's answer…"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none disabled:opacity-50"
          />
        </form>
      </div>
    </div>
  );
}
