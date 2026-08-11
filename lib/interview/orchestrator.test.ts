import { describe, expect, it, vi } from "vitest";
import type { EvidenceChunk } from "@/lib/context/client";
import type {
  IntelligenceProvider,
  ProvisionalRule,
  TranscriptMessage,
} from "@/lib/intelligence/provider";
import {
  FALLBACK_QUESTION,
  findCoverageGaps,
  processTurn,
  type OrchestratorDeps,
  type StoredEvidence,
  type StoredRule,
} from "./orchestrator";

function makeFakeDeps(overrides: Partial<{
  extracted: ProvisionalRule[];
  chunks: EvidenceChunk[];
  classification: "SUPPORTED" | "CONFLICT" | "PARTIAL" | "NO_EVIDENCE" | "NEW_RELATED_AREA";
  topics: string[];
}> = {}) {
  const messages: TranscriptMessage[] = [];
  const rules: StoredRule[] = [];
  const evidenceRows: StoredEvidence[] = [];

  const extracted = overrides.extracted ?? [
    {
      condition: "PR contains destructive migration",
      expectedBehavior: "Require rollback plan, otherwise block",
      exceptions: [],
      sourceTurn: "turn_0",
    },
  ];
  const chunks = overrides.chunks ?? [
    {
      source: "handbook/migrations",
      title: "Migrations",
      content: "Destructive migrations require rollback plan and verified backup.",
      score: 0.8,
    },
  ];
  const classification = overrides.classification ?? "PARTIAL";
  const topics = overrides.topics ?? ["engineering / migrations", "policies / secrets"];

  const intelligence: IntelligenceProvider = {
    extractRule: vi.fn(async () => ({ rules: extracted })),
    classifyEvidence: vi.fn(async () => ({
      classification,
      rationale: "test rationale",
      relevantChunks: ["chunk_0"],
    })),
    generateFollowUp: vi.fn(async () => ({
      question: "Should both be required?",
      rationale: "resolve partial",
      strategy: "conflict" as const,
      abandonRuleIds: [] as string[],
    })),
  };

  const deps: OrchestratorDeps = {
    intelligence,
    retrieveEvidence: vi.fn(async () => chunks),
    scanTopics: vi.fn(async () => topics),
    store: {
      getInterview: async () => ({ agentDescription: "Reviews PRs" }),
      addMessage: async (input) => {
        const msg = { turnIndex: messages.length, speaker: input.speaker, content: input.content };
        messages.push(msg);
        return msg;
      },
      listMessages: async () => messages,
      recentMessages: async (_id, count) => messages.slice(-count),
    },
    rules: {
      create: async (interviewId, rule) => {
        const stored: StoredRule = {
          id: `rule_${rules.length}`,
          condition: rule.condition,
          expectedBehavior: rule.expectedBehavior,
          exceptions: rule.exceptions,
          status: "provisional",
          interviewSources: [rule.sourceTurn],
          contextSources: [],
        };
        rules.push(stored);
        return stored;
      },
      list: async () => rules,
      setStatus: async (id, status) => {
        const r = rules.find((x) => x.id === id);
        if (r) r.status = status;
      },
      attachContextSource: async (id, source) => {
        const r = rules.find((x) => x.id === id);
        if (r && !r.contextSources.includes(source)) r.contextSources.push(source);
      },
    },
    evidence: {
      add: async (input) => {
        const row: StoredEvidence = {
          id: `ev_${evidenceRows.length}`,
          ruleId: input.ruleId ?? null,
          source: input.source,
          relationship: input.relationship,
        };
        evidenceRows.push(row);
        return row;
      },
      list: async () => evidenceRows,
    },
  };

  return { deps, messages, rules, evidenceRows, intelligence };
}

describe("processTurn", () => {
  it("runs the full loop: extract → retrieve → classify → reconcile → follow-up", async () => {
    const { deps, rules, evidenceRows, intelligence } = makeFakeDeps();

    const result = await processTurn(deps, "int_1", "Block destructive migrations without rollback.");

    expect(result.question).toBe("Should both be required?");
    expect(intelligence.extractRule).toHaveBeenCalledOnce();
    expect(intelligence.classifyEvidence).toHaveBeenCalledOnce();
    expect(intelligence.generateFollowUp).toHaveBeenCalledOnce();

    expect(rules).toHaveLength(1);
    expect(rules[0].status).toBe("conflict");
    expect(rules[0].contextSources).toContain("handbook/migrations");
    expect(evidenceRows[0].relationship).toBe("partial");
    expect(result.snapshot.rules).toHaveLength(1);
  });

  it("stores both expert and interviewer messages with monotonic turn indices", async () => {
    const { deps, messages } = makeFakeDeps();
    await processTurn(deps, "int_1", "First answer.");
    expect(messages.map((m) => [m.speaker, m.turnIndex])).toEqual([
      ["expert", 0],
      ["interviewer", 1],
    ]);
  });

  it("SUPPORTED evidence keeps the rule provisional", async () => {
    const { deps, rules } = makeFakeDeps({ classification: "SUPPORTED" });
    await processTurn(deps, "int_1", "Block destructive migrations without rollback.");
    expect(rules[0].status).toBe("provisional");
  });

  it("NO_EVIDENCE stores no evidence rows", async () => {
    const { deps, evidenceRows } = makeFakeDeps({
      classification: "NO_EVIDENCE",
      chunks: [],
    });
    await processTurn(deps, "int_1", "Something with no docs.");
    expect(evidenceRows).toHaveLength(0);
  });

  it("no extracted rules means no retrieval or classification calls", async () => {
    const { deps, intelligence } = makeFakeDeps({ extracted: [] });
    await processTurn(deps, "int_1", "Hello, happy to be here.");
    expect(intelligence.classifyEvidence).not.toHaveBeenCalled();
  });

  it("marks rules unresolved when the follow-up abandons them", async () => {
    const { deps, rules, intelligence } = makeFakeDeps();
    intelligence.generateFollowUp = vi.fn(async () => ({
      question: "Let's talk about something else.",
      rationale: "expert declined twice",
      strategy: "gap" as const,
      abandonRuleIds: ["rule_0", "rule_bogus"],
    }));

    await processTurn(deps, "int_1", "I'm not sure.");
    expect(rules[0].status).toBe("unresolved");
  });

  it("replays the same question when an identical answer is resubmitted", async () => {
    const { deps, messages, intelligence } = makeFakeDeps();

    const first = await processTurn(deps, "int_1", "Block risky deploys.");
    const second = await processTurn(deps, "int_1", "  block   risky deploys. ");

    expect(second.question).toBe(first.question);
    expect(intelligence.extractRule).toHaveBeenCalledOnce();
    expect(messages.filter((m) => m.speaker === "expert")).toHaveLength(1);
  });

  it("does not create near-duplicate rules across turns", async () => {
    const { deps, rules, intelligence } = makeFakeDeps();

    await processTurn(deps, "int_1", "Block destructive migrations without rollback.");
    // The fake extractor always returns the same rule — a near-duplicate of turn 1's.
    await processTurn(deps, "int_1", "As I said, destructive migrations must be blocked.");

    expect(rules).toHaveLength(1);
    expect(intelligence.classifyEvidence).toHaveBeenCalledOnce();
  });

  it("returns the fallback question and preserves state when the loop throws", async () => {
    const { deps, intelligence, messages } = makeFakeDeps();
    intelligence.extractRule = vi.fn(async () => {
      throw new Error("LLM down");
    });

    const result = await processTurn(deps, "int_1", "Block destructive migrations.");
    expect(result.question).toBe(FALLBACK_QUESTION);
    expect(messages.at(-1)?.speaker).toBe("interviewer");
  });
});

describe("findCoverageGaps", () => {
  const rules: StoredRule[] = [
    {
      id: "r1",
      condition: "destructive migration",
      expectedBehavior: "require rollback plan",
      exceptions: [],
      status: "confirmed",
      interviewSources: [],
      contextSources: [],
    },
  ];

  it("returns topics not mentioned in rules or transcript", () => {
    const gaps = findCoverageGaps(
      ["engineering / migrations", "policies / secrets"],
      rules,
      [{ turnIndex: 0, speaker: "expert", content: "migrations need rollback plans" }],
    );
    expect(gaps).toEqual(["policies / secrets"]);
  });

  it("returns empty when every topic word is covered", () => {
    const gaps = findCoverageGaps(
      ["engineering / migrations"],
      rules,
      [{ turnIndex: 0, speaker: "expert", content: "migrations need rollback plans" }],
    );
    expect(gaps).toEqual([]);
  });
});
