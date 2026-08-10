/**
 * ElevenLabs Conversational AI agent configuration for EvalInterview.
 *
 * The agent is intentionally a thin voice transport. All reasoning happens
 * server-side in the EvalInterview orchestrator. This keeps ElevenLabs credit
 * usage low: the system prompt is static and minimal, and the only tool call
 * per turn is `submit_expert_turn`.
 */

export type InterviewerContext = {
  agentName: string;
  agentDescription: string;
  expertRole: string;
  existingRules: string[];
  retrievedEvidence: string[];
  unresolvedConflicts: string[];
  coverageGaps: string[];
  transcriptTail: string[];
};

/**
 * Minimal static system prompt. Dynamic context is NOT included here — the
 * orchestrator computes the next question and returns it via the tool call.
 * This avoids re-sending a long context window on every LLM turn.
 */
export function buildSystemPrompt(): string {
  return `You are a voice interviewer for EvalInterview.

Rules:
1. After the expert speaks, ALWAYS call submit_expert_turn with the exact text of what they said.
2. Speak the response returned by the tool.
3. Do not add your own questions, commentary, or explanations.
4. Keep spoken output concise and natural.
5. If the expert asks a question, call the tool with their question anyway; the engine will decide how to respond.`;
}

export type ElevenLabsWebhookTool = {
  type: "webhook";
  name: string;
  description: string;
  response_timeout_secs: number;
  api_schema: {
    url: string;
    method: "POST";
    headers: Record<string, string>;
    request_body_schema: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
};

export function buildAgentTools(input: {
  interviewId: string;
  baseUrl: string;
  webhookSecret?: string;
}): ElevenLabsWebhookTool[] {
  const url = `${input.baseUrl}/api/interviews/${input.interviewId}/turns`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (input.webhookSecret) {
    headers["x-webhook-secret"] = input.webhookSecret;
  }

  return [
    {
      type: "webhook",
      name: "submit_expert_turn",
      description:
        "Submit the expert's latest answer and receive the next interview question from the EvalInterview engine.",
      response_timeout_secs: 20,
      api_schema: {
        url,
        method: "POST",
        headers,
        request_body_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The exact text of the expert's latest answer.",
            },
          },
          required: ["content"],
        },
      },
    },
  ];
}

export function buildAgentConfig(input: {
  interviewId: string;
  baseUrl: string;
  webhookSecret?: string;
}) {
  return {
    name: `evalinterview-${input.interviewId}`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: buildSystemPrompt(),
        },
        first_message:
          "Hi — I'm here to help turn your expertise into a clear behavioral specification for this AI agent. What behaviors or decisions matter most for how it should act?",
        language: "en",
      },
      tools: buildAgentTools({
        interviewId: input.interviewId,
        baseUrl: input.baseUrl,
        webhookSecret: input.webhookSecret,
      }),
    },
  };
}
