const STOP_SEGMENTS = new Set([
  "docs", "doc", "documentation", "guide", "guides", "en", "www", "index", "page",
  "pages", "v1", "v2", "latest", "html", "php", "aspx",
]);

/**
 * Derive human-readable topic labels from page URLs.
 * e.g. "https://handbook.example.com/engineering/migration-safety"
 *    → "engineering / migration safety"
 */
export function extractTopics(urls: string[]): string[] {
  const topics = new Set<string>();
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s).replace(/\.[a-z0-9]+$/i, ""))
      .filter((s) => s.length > 1 && !STOP_SEGMENTS.has(s.toLowerCase()));
    if (segments.length === 0) continue;
    const label = segments
      .slice(-2)
      .map((s) => s.replace(/[-_]+/g, " ").trim())
      .join(" / ");
    if (label) topics.add(label);
  }
  return [...topics].sort();
}

/**
 * Pick which sitemap URLs to scrape. Prefers URLs under the user-supplied
 * source path, then shallow, content-looking pages. Capped for credit budget.
 */
export function pickRelevantUrls(urls: string[], sourceUrl: string, max: number): string[] {
  let basePath = "/";
  try {
    basePath = new URL(sourceUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    // keep default
  }

  const seen = new Set<string>();
  const unique = urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const underBase = unique.filter((u) => {
    try {
      return new URL(u).pathname.startsWith(basePath);
    } catch {
      return false;
    }
  });

  const pool = underBase.length > 0 ? underBase : unique;
  return pool.slice(0, max);
}
