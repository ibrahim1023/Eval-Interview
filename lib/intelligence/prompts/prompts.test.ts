import { describe, expect, it } from "vitest";
import { buildExtractRulePrompt } from "./extractRule";
import { buildClassifyEvidencePrompt } from "./classifyEvidence";
import { buildFollowUpPrompt } from "./generateFollowUp";

describe("prompt builders", () => {
  it("extractRule prompt embeds transcript with turn ids and the new statement", () => {
    const { user } = buildExtractRulePrompt({
      agentDescription: "Reviews PRs",
      turn: { turnIndex: 3, speaker: "expert", content: "Block migrations without rollback." },
      recentTranscript: [
        { turnIndex: 1, speaker: "interviewer", content: "What blocks approval?" },
        { turnIndex: 2, speaker: "expert", content: "Depends on the change." },
      ],
      existingRules: [
        { id: "r1", condition: "migration", expectedBehavior: "block", status: "provisional" },
      ],
    });

    expect(user).toContain("Reviews PRs");
    expect(user).toContain("[turn_1] interviewer");
    expect(user).toContain("[turn_2] expert");
    expect(user).toContain("[turn_3] expert: Block migrations without rollback.");
    expect(user).toContain("do not re-extract");
    expect(user).toContain("[provisional] migration");
  });

  it("classifyEvidence prompt embeds rule fields and numbered chunks", () => {
    const { user } = buildClassifyEvidencePrompt({
      rule: {
        condition: "Destructive migration",
        expectedBehavior: "Require rollback plan",
        exceptions: ["Hotfix"],
        sourceTurn: "turn_1",
      },
      evidence: [
        { source: "handbook/migrations", title: "Migrations", content: "Requires backup." },
      ],
    });

    expect(user).toContain("Destructive migration");
    expect(user).toContain("Hotfix");
    expect(user).toContain("[chunk_0] source: handbook/migrations");
    expect(user).toContain("Requires backup.");
  });

  it("followUp prompt embeds model, evidence, and gaps", () => {
    const { user } = buildFollowUpPrompt({
      transcript: [{ turnIndex: 0, speaker: "interviewer", content: "Hi" }],
      behaviorModel: [
        { id: "r1", condition: "migration", expectedBehavior: "block", status: "provisional" },
      ],
      evidenceClassifications: [
        { ruleCondition: "migration", classification: "PARTIAL", rationale: "adds backup" },
      ],
      coverageGaps: ["authorization changes"],
    });

    expect(user).toContain("[provisional] (r1) migration");
    expect(user).toContain("PARTIAL: migration (adds backup)");
    expect(user).toContain("authorization changes");
  });
});
