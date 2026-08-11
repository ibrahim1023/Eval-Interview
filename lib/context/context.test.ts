import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextApiError, fetchSitemapUrls, scrapeMarkdown } from "./api";
import { extractTopics, pickRelevantUrls, searchTermFromUrl } from "./topics";

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

  it("passes the search term to the sitemap endpoint when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, urls: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchSitemapUrls("docs.stripe.com", 200, "refunds");
    expect(fetchMock.mock.calls[0][0] as string).toContain("&search=refunds");
  });

  it("passes an abort signal so requests cannot hang forever", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, urls: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchSitemapUrls("a.com");
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
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
      "https://handbook.example.com/engineering",
      "https://handbook.example.com/engineering/a",
      "https://handbook.example.com/engineering/b",
    ]);
  });

  it("falls back to all urls when none match the source path", () => {
    const urls = ["https://a.com/1", "https://a.com/2", "https://a.com/3"];
    expect(pickRelevantUrls(urls, "https://other.com", 2)).toEqual([
      "https://other.com",
      "https://a.com/1",
    ]);
  });

  it("dedupes urls", () => {
    const urls = ["https://a.com/1", "https://a.com/1", "https://a.com/2"];
    expect(pickRelevantUrls(urls, "https://a.com/x", 10)).toHaveLength(3);
  });

  it("skips foreign-language subtrees for a root source", () => {
    const urls = [
      "https://semver.org/lang/ca",
      "https://semver.org/lang/de",
      "https://semver.org/spec/v2.0.0.html",
    ];
    expect(pickRelevantUrls(urls, "https://semver.org", 10)).toEqual([
      "https://semver.org",
      "https://semver.org/spec/v2.0.0.html",
    ]);
  });

  it("treats underscore locales like pt_br as language prefixes", () => {
    const urls = [
      "https://12factor.net/config",
      "https://12factor.net/pt_br/config",
      "https://12factor.net/zh_cn/config",
    ];
    expect(pickRelevantUrls(urls, "https://12factor.net", 10)).toEqual([
      "https://12factor.net",
      "https://12factor.net/config",
    ]);
  });

  it("keeps the source's own locale when the source is localized", () => {
    const urls = ["https://docs.example.com/en/setup", "https://docs.example.com/fr/setup"];
    expect(pickRelevantUrls(urls, "https://docs.example.com/fr", 10)).toEqual([
      "https://docs.example.com/fr",
      "https://docs.example.com/fr/setup",
    ]);
  });

  it("treats all urls as relevant when the sitemap was prescreened by search", () => {
    const urls = [
      "https://docs.stripe.com/refunds",
      "https://docs.stripe.com/radar/refund-abuse",
      "https://docs.stripe.com/terminal/features/refunds",
    ];
    expect(pickRelevantUrls(urls, "https://docs.stripe.com/refunds", 10, true)).toEqual(urls);
  });
});

describe("searchTermFromUrl", () => {
  it("uses the last path segment with separators as spaces", () => {
    expect(searchTermFromUrl("https://docs.stripe.com/refunds")).toBe("refunds");
    expect(searchTermFromUrl("https://docs.stripe.com/agentic-commerce/for-sellers/refunds-and-disputes")).toBe(
      "refunds and disputes",
    );
  });

  it("returns null for root urls and invalid input", () => {
    expect(searchTermFromUrl("https://12factor.net")).toBeNull();
    expect(searchTermFromUrl("not a url")).toBeNull();
  });
});
