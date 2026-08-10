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
};

async function probe(name: string, path: string) {
  try {
    const res = await fetch(`${contextBaseUrl}${path}`, { headers: contextHeaders });
    const body = await res.text();
    console.log(`\n${name} (${path}):`);
    console.log(`  status: ${res.status}`);
    console.log(`  body: ${body.slice(0, 1500)}`);
  } catch (err) {
    console.error(`\n${name} failed:`, err);
  }
}

async function main() {
  console.log("Context.dev API verification");
  console.log(`Base URL: ${contextBaseUrl}`);

  await probe("scrape markdown", "/web/scrape/markdown?url=https://example.com");
  await probe("sitemap crawl", "/web/scrape/sitemap?domain=example.com");
  await probe("web search", "/web/search?query=test");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
