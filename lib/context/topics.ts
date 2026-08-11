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
 * Pick which sitemap URLs to scrape. Always includes the user-supplied source
 * URL first, then prefers URLs under the source path, skipping subtrees in a
 * different language than the source (e.g. /lang/fr/, /de/...). Capped for
 * credit budget.
 */
export function pickRelevantUrls(urls: string[], sourceUrl: string, max: number): string[] {
  const source = sourceUrl.replace(/\/$/, "");
  let basePath = "/";
  try {
    basePath = new URL(sourceUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    // keep default
  }
  const sourceLang = langSegment(basePath);

  const seen = new Set<string>([source]);
  const unique = urls.filter((u) => {
    const normalized = u.replace(/\/$/, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  const underBase = unique.filter((u) => {
    try {
      return new URL(u).pathname.startsWith(basePath);
    } catch {
      return false;
    }
  });

  const pool = (underBase.length > 0 ? underBase : unique).filter((u) => {
    try {
      const lang = langSegment(new URL(u).pathname);
      return !lang || lang === sourceLang;
    } catch {
      return false;
    }
  });

  return [source, ...pool].slice(0, max);
}

// Locale-prefixed path segments: "lang" (semver.org style) or a BCP-47-ish
// code ("en", "pt-BR") as the first segment.
function langSegment(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "lang") return segments[1]?.toLowerCase() ?? null;
  if (segments[0] && /^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(segments[0])) {
    return segments[0].toLowerCase();
  }
  return null;
}
