import { z } from "zod";

export const provisionalRuleSchema = z.object({
  condition: z.string(),
  expectedBehavior: z.string(),
  exceptions: z.array(z.string()).default([]),
  sourceTurn: z.string(),
});
export type ProvisionalRule = z.infer<typeof provisionalRuleSchema>;

export const evidenceClassificationSchema = z.object({
  classification: z.enum(["SUPPORTED", "CONFLICT", "PARTIAL", "NO_EVIDENCE", "NEW_RELATED_AREA"]),
  rationale: z.string(),
  relevantChunks: z.array(z.string()).default([]),
});
export type EvidenceClassification = z.infer<typeof evidenceClassificationSchema>;

export const followUpSchema = z.object({
  question: z.string(),
  rationale: z.string(),
  strategy: z.enum(["probe", "conflict", "gap", "contrastive", "boundary", "wrap_up"]),
});
export type FollowUp = z.infer<typeof followUpSchema>;

export type TranscriptMessage = {
  turnIndex: number;
  speaker: "expert" | "interviewer";
  content: string;
};

export type RuleSummary = {
  id: string;
  condition: string;
  expectedBehavior: string;
  status: "provisional" | "confirmed" | "conflict" | "unresolved";
};

export type EvidenceInput = {
  source: string;
  title: string;
  content: string;
};

export interface IntelligenceProvider {
  extractRule(input: {
    agentDescription: string;
    turn: TranscriptMessage;
    recentTranscript: TranscriptMessage[];
  }): Promise<{ rules: ProvisionalRule[] }>;

  classifyEvidence(input: {
    rule: ProvisionalRule;
    evidence: EvidenceInput[];
  }): Promise<EvidenceClassification>;

  generateFollowUp(input: {
    transcript: TranscriptMessage[];
    behaviorModel: RuleSummary[];
    evidenceClassifications: {
      ruleCondition: string;
      classification: EvidenceClassification["classification"];
      rationale: string;
    }[];
    coverageGaps: string[];
  }): Promise<FollowUp>;
}
