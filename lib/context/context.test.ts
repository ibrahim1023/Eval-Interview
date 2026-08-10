import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextApiError, fetchSitemapUrls, scrapeMarkdown } from "./api";
import { extractTopics, pickRelevantUrls } from "./topics";

describe("context api", () => {
  beforeEach(() => {
    process.env.CONTEXT_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CONTEXT_API_KEY;
  });

  it("fetchSitemapUrls returns urls from the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, urls: ["https://a.com/x", "https://a.com/y"] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const urls = await fetchSitemapUrls("a.com");
    expect(urls).toEqual(["https://a.com/x", "https://a.com/y"]);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/web/scrape/sitemap?domain=a.com");
  });

  it("scrapeMarkdown maps the response to a page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            markdown: "# Migrations\nRequire rollback plans.",
            metadata: { title: "Migrations" },
            url: "https://handbook.example.com/migrations",
          }),
          { status: 200 },
        ),
      ),
    );

    const page = await scrapeMarkdown("https://handbook.example.com/migrations");
    expect(page.title).toBe("Migrations");
    expect(page.markdown).toContain("rollback");
  });

  it("throws ContextApiError on non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
    await expect(fetchSitemapUrls("a.com")).rejects.toBeInstanceOf(ContextApiError);
  });

  it("throws when CONTEXT_API_KEY is missing", async () => {
    delete process.env.CONTEXT_API_KEY;
    await expect(fetchSitemapUrls("a.com")).rejects.toBeInstanceOf(ContextApiError);
  });
});

describe("extractTopics", () => {
  it("derives topic labels from the last two path segments", () => {
    const topics = extractTopics([
      "https://handbook.example.com/engineering/migration-safety",
      "https://handbook.example.com/engineering/testing-guidelines",
      "https://handbook.example.com/policies/secrets",
    ]);
    expect(topics).toContain("engineering / migration safety");
    expect(topics).toContain("engineering / testing guidelines");
    expect(topics).toContain("policies / secrets");
  });

  it("skips junk segments and invalid URLs", () => {
    const topics = extractTopics([
      "https://a.com/docs/en/index.html",
      "not a url",
      "https://a.com",
    ]);
    expect(topics).toEqual([]);
  });

  it("dedupes and sorts", () => {
    const topics = extractTopics([
      "https://a.com/policies/beta",
      "https://a.com/policies/alpha",
      "https://a.com/policies/beta",
    ]);
    expect(topics).toEqual(["policies / alpha", "policies / beta"]);
  });
});

describe("pickRelevantUrls", () => {
  it("prefers urls under the source path and caps the count", () => {
    const urls = [
      "https://handbook.example.com/engineering/a",
      "https://handbook.example.com/engineering/b",
      "https://handbook.example.com/marketing/c",
    ];
    const picked = pickRelevantUrls(urls, "https://handbook.example.com/engineering", 10);
    expect(picked).toEqual([
      "https://handbook.example.com/engineering/a",
      "https://handbook.example.com/engineering/b",
    ]);
  });

  it("falls back to all urls when none match the source path", () => {
    const urls = ["https://a.com/1", "https://a.com/2", "https://a.com/3"];
    expect(pickRelevantUrls(urls, "https://other.com", 2)).toEqual([
      "https://a.com/1",
      "https://a.com/2",
    ]);
  });

  it("dedupes urls", () => {
    const urls = ["https://a.com/1", "https://a.com/1", "https://a.com/2"];
    expect(pickRelevantUrls(urls, "https://a.com", 10)).toHaveLength(2);
  });
});
