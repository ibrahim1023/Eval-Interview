/**
 * ElevenLabs Conversational AI client.
 *
 * The shared `eval-builder` agent is a thin voice transport: it calls
 * `submit_expert_turn` after each expert turn and speaks the returned question.
 * All reasoning happens server-side. The app passes the interview ID as a
 * dynamic variable when starting each conversation.
 */

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export type VoiceSession = {
  signedUrl: string;
};

export class ElevenLabsError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVENLABS_API_KEY is not set");
  }
  return apiKey;
}

function getAgentId(): string {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    throw new ElevenLabsError("ELEVENLABS_AGENT_ID is not set");
  }
  return agentId;
}

export async function startConversation(): Promise<VoiceSession> {
  const agentId = getAgentId();
  const apiKey = getApiKey();

  const res = await fetch(
    `${ELEVENLABS_API_BASE}/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      headers: { "xi-api-key": apiKey },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new ElevenLabsError(
      `Failed to get ElevenLabs signed URL: ${res.status} ${body}`,
      res.status
    );
  }

  const data = (await res.json()) as { signed_url: string };
  return { signedUrl: data.signed_url };
}

export async function deleteAgent(agentId: string): Promise<void> {
  const apiKey = getApiKey();

  const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${agentId}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ElevenLabsError(
      `Failed to delete ElevenLabs agent: ${res.status} ${body}`,
      res.status
    );
  }
}
