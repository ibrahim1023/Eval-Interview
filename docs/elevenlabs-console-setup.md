# ElevenLabs Console Setup

Manual setup for the EvalInterview interviewer agent in the ElevenLabs
Conversational AI console. Create one agent per interview session, or create a
single reusable agent and pass the interview ID in the webhook URL.

---

## 1. Agent Name

```text
evalinterview-interviewer
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

Add one webhook tool with these settings:

| Field | Value |
|-------|-------|
| **Name** | `submit_expert_turn` |
| **Description** | `Submit the expert's latest answer and receive the next interview question from the EvalInterview engine.` |
| **Method** | `POST` |
| **URL** | `https://YOUR_APP_URL/api/interviews/INTERVIEW_ID/turns` |
| **Response timeout** | `20` seconds |

### Headers

```json
{
  "Content-Type": "application/json",
  "x-webhook-secret": "YOUR_ELEVENLABS_WEBHOOK_SECRET"
}
```

### Request Body Schema

```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "The exact text of the expert's latest answer."
    }
  },
  "required": ["content"]
}
```

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
