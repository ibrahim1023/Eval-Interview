/**
 * Verify Context.dev API connectivity and source/retrieval shapes.
 *
 * Run with: CONTEXT_API_BASE_URL=... CONTEXT_API_KEY=... npx tsx scripts/verify-contextdev.ts
 */

export {};

const contextBaseUrl = process.env.CONTEXT_API_BASE_URL ?? "https://api.context.dev/v1";
const contextApiKey = process.env.CONTEXT_API_KEY;

if (!contextApiKey) {
  console.error("CONTEXT_API_KEY is required");
  process.exit(1);
}

const contextHeaders: Record<string, string> = {
  Authorization: `Bearer ${contextApiKey}`,
  "Content-Type": "application/json",
};

async function main() {
  console.log("Context.dev API verification");
  console.log(`Base URL: ${contextBaseUrl}`);

  // The exact endpoints depend on Context.dev's API surface.
  // Update this script once the real API docs are reviewed.

  const endpoints = [
    { name: "list sources", path: "/sources" },
    { name: "query", path: "/query" },
    { name: "search", path: "/search" },
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${contextBaseUrl}${endpoint.path}`, {
        headers: contextHeaders,
      });
      const body = await res.text();
      console.log(`\n${endpoint.name} (${endpoint.path}):`);
      console.log(`  status: ${res.status}`);
      console.log(`  body: ${body.slice(0, 2000)}`);
    } catch (err) {
      console.error(`\n${endpoint.name} failed:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
