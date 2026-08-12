"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

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
  exceptions: string[];
  status: "provisional" | "confirmed" | "conflict" | "unresolved";
  interviewSources: string[];
  contextSources: string[];
  createdAt: string;
};

type Evidence = {
  id: string;
  ruleId: string | null;
  source: string;
  content: string;
  relationship: "supported" | "conflict" | "partial" | "new_area";
};

type LocalTurn = { speaker: "expert" | "interviewer"; content: string };

const STAMP: Record<Rule["status"], { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "text-green-700 border-green-700" },
  provisional: { label: "Provisional", className: "text-neutral-400 border-neutral-400" },
  conflict: { label: "Conflict", className: "text-orange-700 border-orange-700" },
  unresolved: { label: "Unresolved", className: "text-violet-700 border-violet-700" },
};

const MAX_RECONNECT_ATTEMPTS = 3;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Local echoes are matched against the recent server transcript in order.
// Substring containment covers the agent combining its acknowledgment with
// the question in one speech event, and ASR/agent rewording between the SDK
// transcript and what the tool call stored. Interviewer lines the server
// never stores (acknowledgments, paraphrases) are dropped once the server's
// response to that expert turn exists.
function reconcileLocalTurns(turns: LocalTurn[], messages: Message[]): LocalTurn[] {
  const server = messages
    .slice(-8)
    .map((m) => ({ speaker: m.speaker, content: normalize(m.content) }));
  const confirmedAt: (number | null)[] = new Array(turns.length).fill(null);
  let cursor = 0;
  turns.forEach((turn, k) => {
    const n = normalize(turn.content);
    const idx = server.findIndex(
      (s, j) =>
        j >= cursor &&
        s.speaker === turn.speaker &&
        (s.content === n || n.includes(s.content) || s.content.includes(n)),
    );
    if (idx >= 0) {
      confirmedAt[k] = idx;
      cursor = idx + 1;
    }
  });
  let lastExpertIdx = -1;
  return turns.filter((turn, k) => {
    const confirmed = confirmedAt[k];
    if (confirmed !== null) {
      if (turn.speaker === "expert") lastExpertIdx = confirmed;
      return false;
    }
    return !(
      turn.speaker === "interviewer" &&
      lastExpertIdx >= 0 &&
      server.some((s, j) => j > lastExpertIdx && s.speaker === "interviewer")
    );
  });
}

function VoiceControls({
  interviewId,
  crawlStatus,
}: {
  interviewId: string;
  crawlStatus: "pending" | "ready" | "failed";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      reconnectAttempts.current = 0;
      setReconnecting(false);
    },
    onDisconnect: (details) => {
      if (details.reason !== "error") return;
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        setReconnecting(false);
        setError("Connection lost. Start the interview again to continue.");
        return;
      }
      reconnectAttempts.current += 1;
      setReconnecting(true);
      reconnectTimer.current = setTimeout(() => void start(), 2000);
    },
  });

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting" || reconnecting;
  const isSpeaking = conversation.isSpeaking;
  const isListening = conversation.isListening;
  const live = isConnected && (isSpeaking || isListening);

  async function start() {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/voice/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to start voice session: ${body}`);
      }
      const { signedUrl } = (await res.json()) as { signedUrl: string };
      await conversation.startSession({
        signedUrl,
        dynamicVariables: { interview_id: interviewId },
      });
    } catch (err) {
      setReconnecting(false);
      setError(err instanceof Error ? err.message : "Failed to start voice session");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
    setReconnecting(false);
    setBusy(true);
    setError(null);
    try {
      await conversation.endSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end voice session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="flex h-[22px] items-center gap-[3px]">
        {[8, 16, 22, 14, 9].map((h, i) => (
          <i
            key={i}
            className={`w-[3px] rounded-sm ${live ? "animate-pulse bg-[#2b4acb]" : "bg-neutral-300"}`}
            style={{ height: h, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-[13.5px] text-neutral-500">
        <strong className="font-semibold text-neutral-900">
          {reconnecting
            ? "Reconnecting…"
            : isConnecting
              ? "Connecting…"
              : isConnected
                ? isSpeaking
                  ? "Speaking…"
                  : isListening
                    ? "Listening"
                    : "Connected"
                : "Ready"}
        </strong>{" "}
        — the spec updates as you speak
      </span>
      {crawlStatus === "pending" && (
        <span className="text-sm text-neutral-500">Preparing knowledge base…</span>
      )}
      {crawlStatus === "failed" && (
        <span className="text-sm text-amber-700">
          Knowledge source could not be crawled — the interview will run without it.
        </span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button
        onClick={isConnected ? stop : start}
        disabled={busy || isConnecting || crawlStatus === "pending"}
        className={`ml-auto rounded-lg px-4 py-2 text-[13.5px] font-medium disabled:opacity-50 ${
          isConnected
            ? "border border-orange-200 text-orange-700 hover:bg-orange-50"
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        }`}
      >
        {isConnected ? "End interview" : "Start voice interview"}
      </button>
    </>
  );
}

// Registers SDK transcript events into the shared local-echo list. Must live
// inside ConversationProvider; renders nothing. The provider keeps callbacks
// up to date across re-renders.
function ConversationBridge({ onTurn }: { onTurn: (turn: LocalTurn) => void }) {
  useConversation({
    onMessage: ({ message, role }) => {
      if (message) onTurn({ speaker: role === "user" ? "expert" : "interviewer", content: message });
    },
  });
  return null;
}

export function InterviewRoom(props: {
  interviewId: string;
  agentName: string;
  expertRole: string;
  initialMessages: Message[];
  initialRules: Rule[];
  initialEvidence: Evidence[];
  initialCrawlStatus: "pending" | "ready" | "failed";
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(props.initialMessages);
  const [rules, setRules] = useState(props.initialRules);
  const [evidence, setEvidence] = useState(props.initialEvidence);
  const [crawlStatus, setCrawlStatus] = useState(props.initialCrawlStatus);
  const [localTurns, setLocalTurns] = useState<LocalTurn[]>([]);
  const convoBottomRef = useRef<HTMLDivElement>(null);
  const docBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/interviews/${props.interviewId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      setRules(data.rules);
      setEvidence(data.evidence);
      setCrawlStatus(data.interview.crawlStatus);
      setLocalTurns((turns) => reconcileLocalTurns(turns, data.messages as Message[]));
    }, 2500);
    return () => clearInterval(timer);
  }, [props.interviewId]);

  const transcript: (LocalTurn & { pending?: boolean })[] = [
    ...messages.map((m) => ({ speaker: m.speaker, content: m.content })),
    ...localTurns.map((t) => ({ ...t, pending: t.speaker === "expert" })),
  ];
  const engineWorking = transcript.at(-1)?.speaker === "expert";

  useEffect(() => {
    convoBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    docBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, rules.length]);

  async function finish() {
    await fetch(`/api/interviews/${props.interviewId}/finish`, { method: "POST" });
    router.push(`/interview/${props.interviewId}/results`);
  }

  const sortedRules = [...rules].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="flex h-screen flex-col bg-[#fdfcf9] text-neutral-900">
      <nav className="flex shrink-0 items-center justify-between border-b border-[#e8e4da] px-7 py-3.5">
        <span className="text-[15px] font-semibold tracking-tight">EvalInterview</span>
        <span className="text-[13px] text-neutral-400">
          {props.agentName} · interviewing {props.expertRole}
        </span>
        <button
          onClick={finish}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[13.5px] font-medium text-white"
        >
          Finish &amp; review
        </button>
      </nav>

      <ConversationProvider>
        <ConversationBridge
          onTurn={(turn) =>
            setLocalTurns((turns) =>
              turns.length > 0 &&
              normalize(turns.at(-1)!.content) === normalize(turn.content) &&
              turns.at(-1)!.speaker === turn.speaker
                ? turns
                : [...turns, turn],
            )
          }
        />

        <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr]">
          <aside className="overflow-y-auto border-r border-[#e8e4da] bg-[#f7f5ef] px-6 pt-6 pb-24">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.08em] text-neutral-400 uppercase">
              Conversation
            </h2>
            {transcript.length === 0 && (
              <p className="text-[13px] text-neutral-400">
                Start the voice interview — the conversation appears here as stage directions.
              </p>
            )}
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`mb-4 text-[13px] leading-relaxed ${
                  t.speaker === "expert" ? "text-neutral-900" : "text-neutral-500"
                } ${t.pending ? "opacity-50" : ""}`}
              >
                <span className="mb-0.5 block text-[10.5px] font-bold tracking-[0.06em] text-neutral-400 uppercase">
                  {t.speaker === "expert" ? "You" : "Interviewer"}
                  {t.pending && <span className="text-[#2b4acb]"> · heard, processing</span>}
                </span>
                {t.content}
              </div>
            ))}
            <div ref={convoBottomRef} />
          </aside>

          <main className="overflow-y-auto px-14 pt-12 pb-28">
            <div className="mx-auto max-w-[620px]">
              <div className="text-[11px] font-semibold tracking-[0.1em] text-neutral-400 uppercase">
                Behavior specification · drafting live
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">{props.agentName}</h1>
              <p className="mt-1 mb-9 text-[13.5px] text-neutral-500">
                Sections appear as the interview uncovers them. Provenance is attached to every line.
              </p>

              {sortedRules.length === 0 && !engineWorking && (
                <p className="font-serif text-[15px] text-neutral-400 italic">
                  The specification writes itself as you talk.
                </p>
              )}

              {sortedRules.map((rule, i) => {
                const stamp = STAMP[rule.status];
                const conflicts = evidence.filter(
                  (e) =>
                    e.ruleId === rule.id &&
                    (e.relationship === "conflict" || e.relationship === "partial"),
                );
                const provenance =
                  [...rule.interviewSources, ...rule.contextSources].join(" · ") || "no evidence yet";
                return (
                  <section
                    key={rule.id}
                    className={`relative mb-2 border-l-2 py-5 pl-7 ${
                      rule.status === "conflict" ? "border-orange-700" : "border-[#e8e4da]"
                    }`}
                  >
                    <span className="absolute top-5 -left-0 -translate-x-full pr-3.5 font-serif text-[15px] text-neutral-400">
                      §{i + 1}
                    </span>
                    <h3 className="font-serif text-lg font-bold">
                      {rule.condition}
                      <span
                        className={`ml-2.5 inline-block rotate-[-2deg] rounded border-[1.5px] px-2 py-0.5 align-[2px] text-[10px] font-extrabold tracking-[0.1em] uppercase ${stamp.className}`}
                      >
                        {stamp.label}
                      </span>
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                      {rule.expectedBehavior}
                    </p>
                    {rule.exceptions.length > 0 && (
                      <p className="mt-1.5 text-[13px] text-neutral-500">
                        Except: {rule.exceptions.join("; ")}
                      </p>
                    )}
                    {conflicts.length > 0 && (
                      <div className="mt-3 rounded-lg border border-orange-200 border-l-[3px] border-l-orange-700 bg-orange-50 px-4 py-3 text-[13px] leading-relaxed text-orange-900">
                        <strong>Contradicts the knowledge source.</strong> “
                        {conflicts[0].content.slice(0, 220)}”
                        <span className="mt-1.5 block font-mono text-[11.5px] text-orange-700">
                          {conflicts[0].source}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 font-mono text-[11.5px] text-neutral-400">{provenance}</div>
                  </section>
                );
              })}

              {engineWorking && (
                <section className="relative border-l-2 border-[#e8e4da] py-5 pl-7">
                  <span className="absolute top-5 -left-0 -translate-x-full pr-3.5 font-serif text-[15px] text-neutral-400">
                    §{sortedRules.length + 1}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-neutral-400">Drafting…</h3>
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded-md bg-[#eeebe2]" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded-md bg-[#eeebe2]" />
                </section>
              )}
              <div ref={docBottomRef} />
            </div>
          </main>
        </div>

        <footer className="flex shrink-0 items-center gap-4 border-t border-[#e8e4da] px-7 py-4">
          <VoiceControls interviewId={props.interviewId} crawlStatus={crawlStatus} />
        </footer>
      </ConversationProvider>
    </div>
  );
}
