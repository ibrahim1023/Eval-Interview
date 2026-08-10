/**
 * Verify ElevenLabs Conversational AI API connectivity.
 *
 * Run with: ELEVENLABS_API_KEY=... npx tsx scripts/verify-elevenlabs.ts
 */

export {};

const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

if (!elevenlabsApiKey) {
  console.error("ELEVENLABS_API_KEY is required");
  process.exit(1);
}

const elevenlabsHeaders: Record<string, string> = {
  "xi-api-key": elevenlabsApiKey,
  "Content-Type": "application/json",
};

async function main() {
  console.log("ElevenLabs Conversational AI verification");

  // 1. List existing agents
  try {
    const agentsRes = await fetch("https://api.elevenlabs.io/v1/convai/agents", {
      headers: elevenlabsHeaders,
    });
    const agentsBody = await agentsRes.text();
    console.log(`Agents status: ${agentsRes.status}`);
    console.log(`Agents body: ${agentsBody.slice(0, 2000)}`);
  } catch (err) {
    console.error("Agents request failed:", err);
  }

  // 2. Create a test agent (comment out if you want to avoid creating resources)
  try {
    const createRes = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: elevenlabsHeaders,
      body: JSON.stringify({
        name: "evalinterview-verification-agent",
        conversation_config: {
          agent: {
            prompt: {
              prompt: "You are a verification agent. Say hello.",
            },
            first_message: "Hello from the verification script.",
            language: "en",
          },
        },
      }),
    });
    const createBody = await createRes.text();
    console.log(`Create agent status: ${createRes.status}`);
    console.log(`Create agent body: ${createBody.slice(0, 2000)}`);
  } catch (err) {
    console.error("Create agent request failed:", err);
  }

  // 3. Check if a specific agent exists (if ELEVENLABS_AGENT_ID is set)
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    try {
      const agentRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        { headers: elevenlabsHeaders },
      );
      const agentBody = await agentRes.text();
      console.log(`Get agent status: ${agentRes.status}`);
      console.log(`Get agent body: ${agentBody.slice(0, 2000)}`);
    } catch (err) {
      console.error("Get agent request failed:", err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
