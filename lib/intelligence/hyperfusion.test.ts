import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHyperfusionProvider, IntelligenceError } from "./hyperfusion";

function jsonResponse(content: unknown, status = 200) {
  return new Response(
    status === 200
      ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] })
      : JSON.stringify({ error: "boom" }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("hyperfusion provider", () => {
  beforeEach(() => {
    process.env.HYPERFUSION_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HYPERFUSION_API_KEY;
  });

  it("extracts rules from a valid structured response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          rules: [
            {
              condition: "PR contains a destructive migration",
              expectedBehavior: "Require rollback plan, otherwise block",
              exceptions: [],
              sourceTurn: "turn_1",
            },
          ],
        }),
      ),
    );

    const provider = createHyperfusionProvider();
    const out = await provider.extractRule({
      agentDescription: "Reviews PRs",
      turn: { turnIndex: 1, speaker: "expert", content: "Block migrations without rollbacks." },
      recentTranscript: [],
    });

    expect(out.rules).toHaveLength(1);
    expect(out.rules[0].condition).toContain("migration");
    expect(out.rules[0].sourceTurn).toBe("turn_1");
  });

  it("retries once on malformed JSON and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          classification: "PARTIAL",
          rationale: "Handbook adds a backup requirement.",
          relevantChunks: ["chunk_0"],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createHyperfusionProvider();
    const out = await provider.classifyEvidence({
      rule: {
        condition: "c",
        expectedBehavior: "b",
        exceptions: [],
        sourceTurn: "turn_1",
      },
      evidence: [{ source: "s", title: "t", content: "c" }],
    });

    expect(out.classification).toBe("PARTIAL");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws IntelligenceError after two malformed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "garbage" } }] }),
          { status: 200 },
        ),
      ),
    );

    const provider = createHyperfusionProvider();
    await expect(
      provider.generateFollowUp({
        transcript: [],
        behaviorModel: [],
        evidenceClassifications: [],
        coverageGaps: [],
      }),
    ).rejects.toBeInstanceOf(IntelligenceError);
  });

  it("throws IntelligenceError on non-200 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));

    const provider = createHyperfusionProvider();
    await expect(
      provider.extractRule({
        agentDescription: "a",
        turn: { turnIndex: 0, speaker: "expert", content: "x" },
        recentTranscript: [],
      }),
    ).rejects.toBeInstanceOf(IntelligenceError);
  });

  it("throws when HYPERFUSION_API_KEY is missing", async () => {
    delete process.env.HYPERFUSION_API_KEY;
    const provider = createHyperfusionProvider();
    await expect(
      provider.extractRule({
        agentDescription: "a",
        turn: { turnIndex: 0, speaker: "expert", content: "x" },
        recentTranscript: [],
      }),
    ).rejects.toBeInstanceOf(IntelligenceError);
  });

  it("sends model, JSON mode, and generous token budget", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ question: "q", rationale: "r", strategy: "probe" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createHyperfusionProvider();
    await provider.generateFollowUp({
      transcript: [],
      behaviorModel: [],
      evidenceClassifications: [],
      coverageGaps: [],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.max_tokens).toBeGreaterThanOrEqual(2048);
  });
});
