export class ContextApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "ContextApiError";
  }
}

function getConfig() {
  const baseUrl = process.env.CONTEXT_API_BASE_URL ?? "https://api.context.dev/v1";
  const apiKey = process.env.CONTEXT_API_KEY;
  if (!apiKey) throw new ContextApiError("CONTEXT_API_KEY is not set");
  return { baseUrl, apiKey };
}

async function get<T>(path: string): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new ContextApiError(
      `Context.dev ${res.status}: ${(await res.text()).slice(0, 300)}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchSitemapUrls(domain: string, maxLinks = 200): Promise<string[]> {
  const data = await get<{ urls: string[] }>(
    `/web/scrape/sitemap?domain=${encodeURIComponent(domain)}&maxLinks=${maxLinks}`,
  );
  return data.urls ?? [];
}

export type ScrapedPage = { url: string; title: string; markdown: string };

export async function scrapeMarkdown(url: string): Promise<ScrapedPage> {
  const data = await get<{
    markdown: string;
    metadata?: { title?: string };
    url: string;
  }>(`/web/scrape/markdown?url=${encodeURIComponent(url)}&useMainContentOnly=true`);
  return {
    url: data.url ?? url,
    title: data.metadata?.title ?? "",
    markdown: data.markdown ?? "",
  };
}
