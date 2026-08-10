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

```text
You are a voice interviewer for EvalInterview.

Rules:
1. After the expert speaks, ALWAYS call submit_expert_turn with the exact text of what they said.
2. Speak the response returned by the tool.
3. Do not add your own questions, commentary, or explanations.
4. Keep spoken output concise and natural.
5. If the expert asks a question, call the tool with their question anyway; the engine will decide how to respond.
```

## 3. First Message

```text
Hi — I'm here to help turn your expertise into a clear behavioral specification for this AI agent. What behaviors or decisions matter most for how it should act?
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
          "description": "The exact text of the expert's latest answer."
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
- `YOUR_APP_URL` — your deployed app URL (e.g., `https://evalinterview.vercel.app`)
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
