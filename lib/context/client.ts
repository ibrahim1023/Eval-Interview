import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sourceChunks } from "@/lib/db/schema";
import { fetchSitemapUrls, scrapeMarkdown } from "./api";
import { extractTopics, pickRelevantUrls } from "./topics";

export const MAX_SOURCE_PAGES = 25;
export const MAX_CHUNK_CHARS = 6000;

export type EvidenceChunk = {
  source: string;
  title: string;
  content: string;
  score: number;
};

export async function registerSource(input: {
  interviewId: string;
  source: { url: string };
}): Promise<{ pageCount: number }> {
  const domain = new URL(input.source.url).hostname;
  const urls = await fetchSitemapUrls(domain);
  const picked = pickRelevantUrls(urls, input.source.url, MAX_SOURCE_PAGES);

  let pageCount = 0;
  for (const url of picked) {
    try {
      const page = await scrapeMarkdown(url);
      if (!page.markdown.trim()) continue;
      await db
        .insert(sourceChunks)
        .values({
          interviewId: input.interviewId,
          url: page.url,
          title: page.title,
          content: page.markdown.slice(0, MAX_CHUNK_CHARS),
        })
        .onConflictDoNothing();
      pageCount++;
    } catch {
      // Skip pages that fail to scrape (paywalled, blocked, etc.)
    }
  }
  return { pageCount };
}

// plainto_tsquery ANDs every term, which is too strict for rule-shaped
// queries. OR the significant terms and let ts_rank order by relevance.
function toOrQuery(query: string): string {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return [...new Set(terms)].join(" | ");
}

export async function retrieve(input: {
  interviewId: string;
  query: string;
  limit?: number;
}): Promise<EvidenceChunk[]> {
  const limit = input.limit ?? 6;
  const orQuery = toOrQuery(input.query);
  if (!orQuery) return [];

  const rows = await db.execute<{
    url: string;
    title: string;
    content: string;
    score: number;
  }>(sql`
    select
      url,
      title,
      content,
      ts_rank(
        to_tsvector('english', title || ' ' || content),
        to_tsquery('english', ${orQuery})
      ) as score
    from ${sourceChunks}
    where interview_id = ${input.interviewId}
      and to_tsvector('english', title || ' ' || content)
          @@ to_tsquery('english', ${orQuery})
    order by score desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    source: r.url,
    title: r.title,
    content: r.content,
    score: Number(r.score),
  }));
}

export async function scanTopics(input: { interviewId: string }): Promise<string[]> {
  const rows = await db
    .select({ url: sourceChunks.url })
    .from(sourceChunks)
    .where(sql`${sourceChunks.interviewId} = ${input.interviewId}`);
  return extractTopics(rows.map((r) => r.url));
}
