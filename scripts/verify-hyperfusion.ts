/**
 * Verify Hyperfusion API connectivity and capabilities.
 *
 * Run with: HYPERFUSION_API_KEY=... HYPERFUSION_BASE_URL=... npx tsx scripts/verify-hyperfusion.ts
 */

export {};

const hyperfusionBaseUrl = process.env.HYPERFUSION_BASE_URL ?? "https://api.hyperfusion.io/v1";
const hyperfusionApiKey = process.env.HYPERFUSION_API_KEY;

if (!hyperfusionApiKey) {
  console.error("HYPERFUSION_API_KEY is required");
  process.exit(1);
}

const hfHeaders: Record<string, string> = {
  Authorization: `Bearer ${hyperfusionApiKey}`,
};

async function main() {
  console.log("Hyperfusion API verification");
  console.log(`Base URL: ${hyperfusionBaseUrl}`);

  // 1. List models
  try {
    const modelsRes = await fetch(`${hyperfusionBaseUrl}/models`, {
      headers: hfHeaders,
    });
    const modelsBody = await modelsRes.text();
    console.log(`Models status: ${modelsRes.status}`);
    console.log(`Models body: ${modelsBody.slice(0, 2000)}`);
  } catch (err) {
    console.error("Models request failed:", err);
  }

  // 2. Simple chat completion
  try {
    const chatRes = await fetch(`${hyperfusionBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...hfHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 10,
      }),
    });
    const chatBody = await chatRes.text();
    console.log(`Chat status: ${chatRes.status}`);
    console.log(`Chat body: ${chatBody.slice(0, 2000)}`);
  } catch (err) {
    console.error("Chat request failed:", err);
  }

  // 3. JSON mode test
  try {
    const jsonRes = await fetch(`${hyperfusionBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...hfHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "Return JSON: {\"ok\": true}" }],
        response_format: { type: "json_object" },
      }),
    });
    const jsonBody = await jsonRes.text();
    console.log(`JSON mode status: ${jsonRes.status}`);
    console.log(`JSON mode body: ${jsonBody.slice(0, 2000)}`);
  } catch (err) {
    console.error("JSON mode request failed:", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
