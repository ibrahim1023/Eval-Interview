# ElevenLabs Console Setup

Manual setup for the EvalInterview interviewer agent in the ElevenLabs
Conversational AI console. Create one agent per interview session, or create a
single reusable agent and pass the interview ID in the webhook URL.

---

## 1. Agent Name

```text
eval-builder
```

## 2. System Prompt

Structured per the ElevenLabs prompting guide (dedicated sections, Guardrails,
explicit tool usage, emphasis on the critical rule):

```markdown
# Personality

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
2. Call submit_expert_turn, passing the expert's words as the content parameter, preserving their meaning exactly.
3. Speak the returned question aloud, naturally and conversationally.

**Error handling:**
If the tool call fails, say: "Sorry, I missed that. Could you say that again?" Then wait for the expert to repeat their response and call the tool once more. If it fails again, thank the expert and say the interview will pause here.

# Guardrails

Never ask your own questions. Every question you speak must come from the submit_expert_turn tool response. This step is important.
Never summarize, evaluate, or comment on the expert's answers.
Never fabricate rules, policies, or evidence.
If the expert asks you a question, call submit_expert_turn with their question — the engine decides how to respond.

# Tone

Speak in a warm, conversational manner. Keep spoken turns short — one question at a time. Write out numbers and symbols as words when speaking (for example, "ten thousand dollars" instead of digits).
```

## 3. First Message

```text
Hi! I'm going to ask you about the agent you're defining — what it should do, what it should never do, and where the boundaries are. To start: what behavior matters most to you?
```

## 4. Language

```text
en
```

## 5. Webhook Tool

Add one webhook tool in the agent's **Tools** section. Paste this exact JSON:

```json
{
  "type": "webhook",
  "name": "submit_expert_turn",
  "description": "Submit the expert's latest answer and receive the next interview question from the EvalInterview engine.",
  "api_schema": {
    "url": "https://YOUR_APP_URL/api/interviews/INTERVIEW_ID/turns",
    "method": "POST",
    "path_params_schema": [],
    "query_params_schema": [],
    "request_body_schema": {
      "type": "object",
      "properties": {
        "content": {
          "type": "string",
          "description": "The expert's complete response as plain spoken text, preserving their meaning exactly, e.g. 'Block destructive migrations unless a rollback plan exists.'"
        }
      },
      "required": ["content"]
    },
    "request_headers": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "x-webhook-secret",
        "value": "YOUR_WEBHOOK_SECRET"
      }
    ],
    "content_type": "application/json",
    "auth_connection": null
  },
  "response_timeout_secs": 20,
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  },
  "assignments": [],
  "interruption_mode": "allow",
  "pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "execution_mode": "immediate",
  "tool_error_handling_mode": "auto",
  "response_mocks": []
}
```

Replace:
- `YOUR_APP_URL` — `https://evalinterview.vercel.app`
- `INTERVIEW_ID` — the interview UUID from your database
- `YOUR_WEBHOOK_SECRET` — the same secret set in `.env` as `ELEVENLABS_WEBHOOK_SECRET`

### Expected Response

The webhook must return JSON with a `question` field. The agent will speak this
as the next interviewer turn.

```json
{
  "question": "What would make you reject it instead?"
}
```

If the interview should end, return:

```json
{
  "question": "Thanks — that gives me enough to work with. I'll compile the behavior spec now."
}
```

---

## 6. Voice Settings

Use your preferred voice. For lowest latency/credits, choose a fast, low-cost
voice and disable unnecessary TTS features.

## 7. Optional: Turn Timeout

If the console exposes a turn timeout setting, set it to `10` seconds so the
agent calls the tool promptly after the expert finishes speaking.

---

## Notes for EvalInterview

- The agent is a thin voice transport. All reasoning (rule extraction, evidence
  retrieval, conflict detection, next-question generation) happens server-side
  in the EvalInterview orchestrator.
- The system prompt is intentionally static to minimize ElevenLabs credit usage.
- Do not add dynamic context (rules, evidence, conflicts) to the system prompt;
  the orchestrator already uses that context to generate the next question.
