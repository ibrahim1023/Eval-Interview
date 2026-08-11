import { beforeEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsError, deleteAgent, startConversation } from "./client";
import { buildSystemPrompt } from "./agent-config";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe("buildSystemPrompt", () => {
  it("includes the key sections and tool instructions", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("# Personality");
    expect(prompt).toContain("# Goal");
    expect(prompt).toContain("# Tools");
    expect(prompt).toContain("submit_expert_turn");
    expect(prompt).toContain("# Guardrails");
    expect(prompt).toContain("# Tone");
    expect(prompt).toContain("Never ask your own questions");
    expect(prompt).toContain("call the submit_expert_turn tool");
  });
});

describe("startConversation", () => {
  it("throws when ELEVENLABS_API_KEY is missing", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_AGENT_ID = "agent_123";

    await expect(startConversation()).rejects.toThrow(ElevenLabsError);
    await expect(startConversation()).rejects.toThrow("ELEVENLABS_API_KEY is not set");
  });

  it("throws when ELEVENLABS_AGENT_ID is missing", async () => {
    process.env.ELEVENLABS_API_KEY = "key";
    delete process.env.ELEVENLABS_AGENT_ID;

    await expect(startConversation()).rejects.toThrow(ElevenLabsError);
    await expect(startConversation()).rejects.toThrow("ELEVENLABS_AGENT_ID is not set");
  });

  it("returns a signed URL on success", async () => {
    process.env.ELEVENLABS_API_KEY = "key";
    process.env.ELEVENLABS_AGENT_ID = "agent_123";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signed_url: "wss://signed.example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const session = await startConversation();

    expect(session).toEqual({ signedUrl: "wss://signed.example.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_123",
      { headers: { "xi-api-key": "key" } }
    );
  });

  it("throws with response body on failure", async () => {
    process.env.ELEVENLABS_API_KEY = "key";
    process.env.ELEVENLABS_AGENT_ID = "agent_123";

    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }));

    await expect(startConversation()).rejects.toThrow("Failed to get ElevenLabs signed URL: 401 unauthorized");
  });
});

describe("deleteAgent", () => {
  it("throws when ELEVENLABS_API_KEY is missing", async () => {
    delete process.env.ELEVENLABS_API_KEY;

    await expect(deleteAgent("agent_123")).rejects.toThrow(ElevenLabsError);
    await expect(deleteAgent("agent_123")).rejects.toThrow("ELEVENLABS_API_KEY is not set");
  });

  it("calls DELETE on the agent endpoint", async () => {
    process.env.ELEVENLABS_API_KEY = "key";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await deleteAgent("agent_123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/agents/agent_123",
      { method: "DELETE", headers: { "xi-api-key": "key" } }
    );
  });

  it("throws with response body on failure", async () => {
    process.env.ELEVENLABS_API_KEY = "key";

    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 404,
      text: async () => "not found",
    }));

    await expect(deleteAgent("agent_123")).rejects.toThrow("Failed to delete ElevenLabs agent: 404 not found");
  });
});
