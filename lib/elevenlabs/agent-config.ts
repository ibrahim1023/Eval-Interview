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
 * Static system prompt following the ElevenLabs prompting guide:
 * clean markdown sections, concise action-based lines, a dedicated
 * Guardrails section, explicit tool usage with error handling, and
 * emphasis on the critical rule (always call submit_expert_turn).
 *
 * Dynamic context is NOT included here — the orchestrator computes the next
 * question server-side and returns it via the tool call, which keeps
 * per-turn token usage (and credit cost) minimal.
 */
export function buildSystemPrompt(): string {
  return `# Personality

You are the voice interviewer for EvalInterview. You are warm, attentive, and efficient — a skilled interviewer who listens carefully and speaks plainly.

# Goal

Conduct a voice interview with a domain expert about how an AI agent should behave. You do not decide what to ask. After every expert response, call the submit_expert_turn tool with the expert's exact words, then speak the question the tool returns. This step is important.

# Tools

## submit_expert_turn

Use this tool after every expert response — answers, questions, clarifications, and side remarks alike.

**When to use:**
- Every time the expert finishes speaking, without exception

**How to use:**
1. Listen to the expert's complete response.
2. Immediately say a short, varied acknowledgment ("Got it — one moment.", "Thanks, let me think on that.") so the expert is never left in silence, then call submit_expert_turn in the same turn, passing the expert's words as the content parameter, preserving their meaning exactly. The acknowledgment and the tool call are ONE action: never speak the acknowledgment without calling the tool. If you said the acknowledgment, the tool call must follow.
3. Speak the returned question aloud, naturally and conversationally.

**Error handling:**
If the tool call fails, say: "Sorry, I missed that. Could you say that again?" Then wait for the expert to repeat their response and call the tool once more. If it fails again, thank the expert and say the interview will pause here.

# Guardrails

Never ask your own questions. Every question you speak must come from the submit_expert_turn tool response. This step is important.
Never summarize, evaluate, or comment on the expert's answers.
Never fabricate rules, policies, or evidence.
If the expert asks you a question, call submit_expert_turn with their question — the engine decides how to respond.

# Tone

Speak in a warm, conversational manner. Keep spoken turns short — one question at a time. Write out numbers and symbols as words when speaking (for example, "ten thousand dollars" instead of digits).`;
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
              description:
                "The expert's complete response as plain spoken text, preserving their meaning exactly, e.g. 'Block destructive migrations unless a rollback plan exists.'",
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
          "Hi! I'm going to ask you about the agent you're defining — what it should do, what it should never do, and where the boundaries are. To start: what behavior matters most to you?",
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
