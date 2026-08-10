import { z } from "zod";
import type { IntelligenceProvider } from "./provider";
import {
  evidenceClassificationSchema,
  followUpSchema,
  provisionalRuleSchema,
} from "./provider";
import { buildExtractRulePrompt } from "./prompts/extractRule";
import { buildClassifyEvidencePrompt } from "./prompts/classifyEvidence";
import { buildFollowUpPrompt } from "./prompts/generateFollowUp";

const MODEL = "openai/gpt-oss-120b";
// gpt-oss-120b is a reasoning model; reasoning_content consumes the token budget.
const MAX_TOKENS = 4096;

export class IntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntelligenceError";
  }
}

type ChatMessage = { role: "system" | "user"; content: string };

async function chat(messages: ChatMessage[], temperature: number): Promise<string> {
  const baseUrl = process.env.HYPERFUSION_BASE_URL ?? "https://api.hyperfusion.io/v1";
  const apiKey = process.env.HYPERFUSION_API_KEY;
  if (!apiKey) throw new IntelligenceError("HYPERFUSION_API_KEY is not set");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new IntelligenceError(`Hyperfusion ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new IntelligenceError("Hyperfusion returned empty content");
  return content;
}

async function callStructured<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  temperature: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chat(messages, temperature);
      return schema.parse(JSON.parse(raw));
    } catch (err) {
      lastError = err;
    }
  }
  throw new IntelligenceError(
    `Structured output failed after retry: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export function createHyperfusionProvider(): IntelligenceProvider {
  return {
    async extractRule(input) {
      const { system, user } = buildExtractRulePrompt(input);
      const out = await callStructured(
        z.object({ rules: z.array(provisionalRuleSchema) }),
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.2,
      );
      return out;
    },

    async classifyEvidence(input) {
      const { system, user } = buildClassifyEvidencePrompt(input);
      return callStructured(
        evidenceClassificationSchema,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.1,
      );
    },

    async generateFollowUp(input) {
      const { system, user } = buildFollowUpPrompt(input);
      return callStructured(
        followUpSchema,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.4,
      );
    },
  };
}
