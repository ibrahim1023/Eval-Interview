import type { EvidenceChunk } from "@/lib/context/client";
import type {
  EvidenceClassification,
  IntelligenceProvider,
  ProvisionalRule,
  RuleSummary,
  TranscriptMessage,
} from "@/lib/intelligence/provider";
import { reconcileStatus, type RuleStatus } from "@/lib/rules/model";

export type StoredRule = {
  id: string;
  condition: string;
  expectedBehavior: string;
  exceptions: string[];
  status: RuleStatus;
  interviewSources: string[];
  contextSources: string[];
};

export type StoredEvidence = {
  id: string;
  ruleId: string | null;
  source: string;
  relationship: "supported" | "conflict" | "partial" | "new_area";
};

export type InterviewSnapshot = {
  rules: StoredRule[];
  evidence: StoredEvidence[];
  coverageGaps: string[];
};

export type OrchestratorDeps = {
  intelligence: IntelligenceProvider;
  retrieveEvidence(input: {
    interviewId: string;
    query: string;
    limit?: number;
  }): Promise<EvidenceChunk[]>;
  scanTopics(input: { interviewId: string }): Promise<string[]>;
  store: {
    getInterview(id: string): Promise<{ agentDescription: string } | undefined>;
    addMessage(input: {
      interviewId: string;
      speaker: "expert" | "interviewer";
      content: string;
    }): Promise<TranscriptMessage>;
    listMessages(interviewId: string): Promise<TranscriptMessage[]>;
    recentMessages(interviewId: string, count: number): Promise<TranscriptMessage[]>;
  };
  rules: {
    create(interviewId: string, rule: ProvisionalRule): Promise<StoredRule>;
    list(interviewId: string): Promise<StoredRule[]>;
    setStatus(id: string, status: RuleStatus): Promise<void>;
    attachContextSource(id: string, source: string): Promise<void>;
  };
  evidence: {
    add(input: {
      interviewId: string;
      ruleId?: string;
      source: string;
      content: string;
      relationship: StoredEvidence["relationship"];
    }): Promise<StoredEvidence>;
    list(interviewId: string): Promise<StoredEvidence[]>;
  };
};

const CLASSIFICATION_TO_RELATIONSHIP: Record<
  EvidenceClassification["classification"],
  StoredEvidence["relationship"] | null
> = {
  SUPPORTED: "supported",
  CONFLICT: "conflict",
  PARTIAL: "partial",
  NEW_RELATED_AREA: "new_area",
  NO_EVIDENCE: null,
};

export const FALLBACK_QUESTION =
  "Sorry, I missed that — could you repeat your last answer?";

export type ProcessTurnResult = {
  question: string;
  snapshot: InterviewSnapshot;
};

export async function processTurn(
  deps: OrchestratorDeps,
  interviewId: string,
  expertContent: string,
): Promise<ProcessTurnResult> {
  try {
    return await runLoop(deps, interviewId, expertContent);
  } catch {
    await deps.store.addMessage({
      interviewId,
      speaker: "interviewer",
      content: FALLBACK_QUESTION,
    });
    return { question: FALLBACK_QUESTION, snapshot: await snapshot(deps, interviewId) };
  }
}

async function runLoop(
  deps: OrchestratorDeps,
  interviewId: string,
  expertContent: string,
): Promise<ProcessTurnResult> {
  const interview = await deps.store.getInterview(interviewId);
  if (!interview) throw new Error(`Interview not found: ${interviewId}`);

  const expertTurn = await deps.store.addMessage({
    interviewId,
    speaker: "expert",
    content: expertContent,
  });

  const recentTranscript = await deps.store.recentMessages(interviewId, 12);

  const { rules: extracted } = await deps.intelligence.extractRule({
    agentDescription: interview.agentDescription,
    turn: expertTurn,
    recentTranscript,
  });

  // Rules are independent: retrieve + classify each one concurrently.
  const classifications = await Promise.all(
    extracted.map(async (provisional) => {
      const stored = await deps.rules.create(interviewId, provisional);

      const chunks = await deps.retrieveEvidence({
        interviewId,
        query: `${provisional.condition} ${provisional.expectedBehavior}`,
        limit: 6,
      });

      const classification = await deps.intelligence.classifyEvidence({
        rule: provisional,
        evidence: chunks,
      });

      const relationship = CLASSIFICATION_TO_RELATIONSHIP[classification.classification];
      if (relationship && chunks.length > 0) {
        const relevant = chunks.filter((c) =>
          classification.relevantChunks.length === 0
            ? true
            : classification.relevantChunks.some((id) => {
                const idx = Number(id.replace("chunk_", ""));
                return chunks[idx] === c;
              }),
        );
        for (const chunk of relevant) {
          await deps.evidence.add({
            interviewId,
            ruleId: stored.id,
            source: chunk.source,
            content: chunk.content.slice(0, 2000),
            relationship,
          });
          await deps.rules.attachContextSource(stored.id, chunk.source);
        }
      }

      const newStatus = reconcileStatus(classification.classification);
      if (newStatus) await deps.rules.setStatus(stored.id, newStatus);

      return {
        ruleCondition: provisional.condition,
        classification: classification.classification,
        rationale: classification.rationale,
      };
    }),
  );

  const allRules = await deps.rules.list(interviewId);
  const transcript = await deps.store.listMessages(interviewId);
  const topics = await deps.scanTopics({ interviewId });
  const coverageGaps = findCoverageGaps(topics, allRules, transcript);

  const followUp = await deps.intelligence.generateFollowUp({
    transcript,
    behaviorModel: allRules.map(toSummary),
    evidenceClassifications: classifications,
    coverageGaps,
  });

  const knownRuleIds = new Set(allRules.map((r) => r.id));
  for (const id of followUp.abandonRuleIds) {
    if (knownRuleIds.has(id)) await deps.rules.setStatus(id, "unresolved");
  }

  await deps.store.addMessage({
    interviewId,
    speaker: "interviewer",
    content: followUp.question,
  });

  return { question: followUp.question, snapshot: await snapshot(deps, interviewId) };
}

function toSummary(rule: StoredRule): RuleSummary {
  return {
    id: rule.id,
    condition: rule.condition,
    expectedBehavior: rule.expectedBehavior,
    status: rule.status,
  };
}

/**
 * Topics from the knowledge source that neither rules nor the transcript
 * mention. Simple substring matching is enough at MVP scale.
 */
export function findCoverageGaps(
  topics: string[],
  rules: StoredRule[],
  transcript: TranscriptMessage[],
): string[] {
  const covered = [
    ...rules.flatMap((r) => [r.condition, r.expectedBehavior]),
    ...transcript.filter((m) => m.speaker === "expert").map((m) => m.content),
  ]
    .join("\n")
    .toLowerCase();

  return topics.filter((topic) => {
    const words = topic.toLowerCase().split(/[\s/]+/).filter((w) => w.length > 3);
    return words.length > 0 && !words.some((w) => covered.includes(w));
  });
}

async function snapshot(
  deps: OrchestratorDeps,
  interviewId: string,
): Promise<InterviewSnapshot> {
  const [rules, evidenceRows, topics, transcript] = await Promise.all([
    deps.rules.list(interviewId),
    deps.evidence.list(interviewId),
    deps.scanTopics({ interviewId }),
    deps.store.listMessages(interviewId),
  ]);
  return {
    rules,
    evidence: evidenceRows,
    coverageGaps: findCoverageGaps(topics, rules, transcript),
  };
}
