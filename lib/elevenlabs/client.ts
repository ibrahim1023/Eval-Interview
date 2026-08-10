/**
 * ElevenLabs Conversational AI client.
 *
 * Creates interviewer agents and manages conversations. The agent is a thin
 * voice transport: it calls `submit_expert_turn` after each expert turn and
 * speaks the returned question. All reasoning happens server-side.
 */

import { buildAgentConfig } from "./agent-config";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export type VoiceSession = {
  conversationId: string;
  clientToken: string;
};

export class ElevenLabsError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export async function createInterviewAgent(input: {
  interviewId: string;
  baseUrl: string;
  webhookSecret?: string;
}): Promise<{ agentId: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not set");
  }

  const config = buildAgentConfig(input);

  const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/create`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ElevenLabsError(
      `Failed to create ElevenLabs agent: ${res.status} ${body}`,
      res.status
    );
  }

  const data = (await res.json()) as { agent_id: string };
  return { agentId: data.agent_id };
}

export async function startConversation(input: {
  agentId: string;
}): Promise<VoiceSession> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not set");
  }

  // ElevenLabs Conversational AI conversations are typically started from the
  // client-side SDK using the agent ID. The server only needs the agent ID.
  // This function is a placeholder for any server-side conversation setup
  // (e.g. generating a signed conversation token if the API supports it).

  // TODO(phase-2): confirm exact conversation start mechanism from
  // scripts/verify-elevenlabs.ts findings.
  return {
    conversationId: `conv_${input.agentId}`,
    clientToken: "",
  };
}

export async function deleteAgent(agentId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not set");
  }

  const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${agentId}`, {
    method: "DELETE",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ElevenLabsError(
      `Failed to delete ElevenLabs agent: ${res.status} ${body}`,
      res.status
    );
  }
}
