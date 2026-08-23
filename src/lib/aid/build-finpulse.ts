import { createHash } from "crypto";
import {
  listAidSocialPosts,
  parseFinPulseSummary,
  upsertAidSocialPost,
} from "@/lib/db/aid-social-posts";
import { searchTavilyForTicker } from "@/lib/aid/tavily-search";
import { listFinPulseHandles } from "@/lib/aid/finpulse-handles";
import { summarizeFinPulsePost, extractTickersFromText } from "@/lib/aid/summarize-finpulse";
import { withFinPulseImpactScore, sortByImpactScore } from "@/lib/aid/impact-score";
import { languageCodeToName } from "@/lib/languages";
import type { AidFinPulseItem } from "@/lib/types";

export const FINPULSE_CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_TTL_MS = FINPULSE_CACHE_TTL_MS;
/** On-read and cron skip Tavily+LLM while the 24h cache is still valid. */
export const FINPULSE_ON_READ_STALE_MS = FINPULSE_CACHE_TTL_MS;
const MAX_GENERATE_PER_RUN = 8;

export function finPulseNeedsIngest(
  newestFetchedAt: string | undefined,
  now = Date.now(),
  staleMs = FINPULSE_ON_READ_STALE_MS,
): boolean {
  if (!newestFetchedAt) return true;
  const t = Date.parse(newestFetchedAt);
  if (Number.isNaN(t)) return true;
  return now - t >= staleMs;
}

function postKeyFromUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

function rowToItem(
  row: Awaited<ReturnType<typeof listAidSocialPosts>>[number],
  handleMeta: Map<string, { displayName: string; tags: string[] }>,
  portfolioTickers: Set<string>,
): AidFinPulseItem | null {
  const summary = parseFinPulseSummary(row.summaryJson);
  if (!summary) return null;
  let tickers: string[] = [];
  let tags: string[] = [];
  try {
    tickers = JSON.parse(row.tickersJson) as string[];
  } catch {
    tickers = [];
  }
  try {
    tags = JSON.parse(row.tagsJson) as string[];
  } catch {
    tags = [];
  }
  const meta = handleMeta.get(row.handle.toLowerCase());
  const portfolioRelevant = tickers.some((t) => portfolioTickers.has(t.toUpperCase()));
  return withFinPulseImpactScore({
    id: row.id,
    handle: row.handle,
    displayName: meta?.displayName ?? row.handle,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt,
    headline: summary.headline || row.headline,
    bullets: summary.bullets,
    impact: summary.impact,
    tickers,
    tags: tags.length > 0 ? tags : meta?.tags ?? [],
    cachedAt: row.fetchedAt,
    portfolioRelevant,
  });
}

export async function ingestFinPulseFromTavily(maxGenerate = MAX_GENERATE_PER_RUN): Promise<number> {
  const handles = await listFinPulseHandles();
  let generated = 0;
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  for (const h of handles) {
    if (generated >= maxGenerate) break;
    const query = `site:x.com @${h.handle} latest post market`;
    const results = await searchTavilyForTicker(query, 3);
    for (const r of results) {
      if (generated >= maxGenerate) break;
      if (!r.url.includes("x.com") && !r.url.includes("twitter.com")) continue;
      const postKey = postKeyFromUrl(r.url);
      const summary = await summarizeFinPulsePost({
        handle: h.handle,
        title: r.title,
        excerpt: r.content,
        sourceUrl: r.url,
        language: "English",
      });
      if (!summary) continue;
      const tickers = extractTickersFromText(`${r.title} ${r.content}`, []);
      await upsertAidSocialPost({
        handle: h.handle,
        postKey,
        sourceUrl: r.url,
        publishedAt: new Date().toISOString(),
        headline: summary.headline,
        summary,
        tickers,
        tags: h.tags,
        expiresAt,
      });
      generated += 1;
    }
  }

  return generated;
}

export async function buildFinPulse(args: {
  tab: "foryou" | "market_voices";
  portfolioTickers: string[];
  language: string;
  limit?: number;
}): Promise<AidFinPulseItem[]> {
  const handles = await listFinPulseHandles();
  const handleMeta = new Map(handles.map((h) => [h.handle.toLowerCase(), h]));
  const portfolioSet = new Set(args.portfolioTickers.map((t) => t.toUpperCase()));
  const rows = await listAidSocialPosts(args.limit ?? 30);

  const items = rows
    .map((row) => rowToItem(row, handleMeta, portfolioSet))
    .filter((i): i is AidFinPulseItem => i != null);

  if (args.tab === "foryou") {
    return sortByImpactScore(items.filter((i) => i.portfolioRelevant)).slice(0, args.limit ?? 12);
  }

  return sortByImpactScore(items).slice(0, args.limit ?? 12);
}

export async function buildFinPulseForUser(args: {
  tab: "foryou" | "market_voices";
  portfolioTickers: string[];
  language: string;
  maxGenerate?: number;
}): Promise<{ items: AidFinPulseItem[]; generated: number }> {
  const langName = languageCodeToName(args.language);
  const existing = await listAidSocialPosts(1);
  if (finPulseNeedsIngest(existing[0]?.fetchedAt)) {
    await ingestFinPulseFromTavily(args.maxGenerate ?? 4);
  }

  const handles = await listFinPulseHandles();
  const handleMeta = new Map(handles.map((h) => [h.handle.toLowerCase(), h]));
  const portfolioSet = new Set(args.portfolioTickers.map((t) => t.toUpperCase()));

  if (args.tab === "foryou" && args.portfolioTickers.length > 0) {
    let generated = 0;
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    for (const ticker of args.portfolioTickers.slice(0, 5)) {
      if (generated >= (args.maxGenerate ?? 3)) break;
      const results = await searchTavilyForTicker(`site:x.com ${ticker} stock market`, 2);
      for (const r of results) {
        if (!r.url.includes("x.com") && !r.url.includes("twitter.com")) continue;
        const postKey = postKeyFromUrl(r.url);
        const summary = await summarizeFinPulsePost({
          handle: "finpulse",
          title: r.title,
          excerpt: r.content,
          sourceUrl: r.url,
          language: langName,
          portfolioTickers: args.portfolioTickers,
        });
        if (!summary) continue;
        const tickers = extractTickersFromText(`${r.title} ${r.content}`, args.portfolioTickers);
        await upsertAidSocialPost({
          handle: "finpulse",
          postKey,
          sourceUrl: r.url,
          publishedAt: new Date().toISOString(),
          headline: summary.headline,
          summary,
          tickers: tickers.length > 0 ? tickers : [ticker.toUpperCase()],
          tags: ["portfolio"],
          expiresAt,
        });
        generated += 1;
      }
    }
  }

  const items = (await listAidSocialPosts(40))
    .map((row) => rowToItem(row, handleMeta, portfolioSet))
    .filter((i): i is AidFinPulseItem => i != null);

  if (args.tab === "foryou") {
    return { items: items.filter((i) => i.portfolioRelevant).slice(0, 12), generated: 0 };
  }
  return { items: items.slice(0, 12), generated: 0 };
}
