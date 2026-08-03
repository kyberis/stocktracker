import { randomUUID } from "crypto";
import {
  getAidNewsCacheEntry,
  listAidNewsCacheForUser,
  parseAidDigestSummary,
  upsertAidNewsCache,
} from "@/lib/db/aid-news-cache";
import { listCalendarEvents, listHoldings } from "@/lib/db";
import {
  ingestNewsArticles,
  listPortfolioNewsForTickers,
  listSymbolsNeedingProviderFetch,
  normalizePortfolioNewsSymbol,
  touchSymbolFetchMeta,
} from "@/lib/db/portfolio-news";
import { fetchFinnhubPortfolioNews } from "@/lib/api-providers/finnhub-news";
import { rankPortfolioNewsForTickers } from "@/lib/portfolio-news-rank";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withDigestImpactScore, sortByImpactScore } from "@/lib/aid/impact-score";
import { summarizeAidDigestItem } from "@/lib/aid/summarize-digest";
import { searchTavilyForTicker } from "@/lib/aid/tavily-search";
import { earningsEventKey, earningsExpiresAt } from "@/lib/aid/earnings-keys";
import { formatEarningsCalendarDetails, sanitizeDigestBullet } from "@/lib/aid/format-earnings-details";
import { languageCodeToName } from "@/lib/languages";
import type { AidDigestItem, AidNewsFilterTag, NewsArticle } from "@/lib/types";
import type { QuoteData } from "@/lib/types";

const HOURS_48_MS = 48 * 3600 * 1000;
const CACHE_TTL_MS = 24 * 3600 * 1000;
export const AID_DIGEST_FEED_LIMIT = 40;
const MAX_GENERATE_PER_REQUEST = 10;

function articleEventKey(article: NewsArticle): string {
  return `article:${article.url.slice(0, 200)}`;
}

function cacheRowToItem(
  row: Awaited<ReturnType<typeof getAidNewsCacheEntry>>,
  movePct: number | null,
): AidDigestItem | null {
  if (!row) return null;
  const summary = parseAidDigestSummary(row.summaryJson);
  if (!summary) return null;
  return withDigestImpactScore({
    id: row.id,
    ticker: row.ticker,
    movePct,
    headline: summary.headline || row.headline,
    bullets: summary.bullets.map(sanitizeDigestBullet),
    impact: summary.impact,
    filterTags: summary.filterTags,
    usedWeb: row.usedWeb,
    cachedAt: row.fetchedAt,
    eventKey: row.eventKey,
  });
}

function primaryTicker(article: NewsArticle, tickers: string[]): string {
  const upper = tickers.map((t) => t.toUpperCase());
  for (const ts of article.tickerSentiment) {
    const i = upper.indexOf(ts.ticker.toUpperCase());
    if (i >= 0) return tickers[i]!;
  }
  return article.tickerSentiment[0]?.ticker ?? tickers[0] ?? "?";
}

function isWithin48h(publishedAt: string): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= HOURS_48_MS;
}

async function ensurePortfolioNews(tickers: string[]): Promise<NewsArticle[]> {
  const norm = tickers.map(normalizePortfolioNewsSymbol);
  const staleMs = 6 * 3600 * 1000;
  const needFetch = await listSymbolsNeedingProviderFetch(norm, staleMs);
  const finnhubKey = process.env.FINNHUB_API_KEY ?? "";
  if (needFetch.length > 0 && finnhubKey) {
    try {
      const fetched = await fetchFinnhubPortfolioNews(needFetch, finnhubKey);
      if (fetched.length > 0) {
        await ingestNewsArticles(fetched);
        await touchSymbolFetchMeta(needFetch);
      }
    } catch {
      /* best-effort */
    }
  }
  return listPortfolioNewsForTickers(norm, 80);
}

export async function buildAidDigest(args: {
  userId: string;
  portfolioId?: string;
  language: string;
  quotes: Record<string, QuoteData>;
  forceRefreshTicker?: string;
  maxGenerate?: number;
  sinceVisit?: string;
  feedLimit?: number;
}): Promise<{ items: AidDigestItem[]; earningsTodayCount: number; newSinceVisitCount: number }> {
  const holdings = await listHoldings(args.userId, args.portfolioId);
  if (holdings.length === 0) {
    return { items: [], earningsTodayCount: 0, newSinceVisitCount: 0 };
  }

  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  if (tickers.length === 0) return { items: [], earningsTodayCount: 0, newSinceVisitCount: 0 };

  const langName = languageCodeToName(args.language);
  const today = new Date().toISOString().slice(0, 10);
  const newsExpiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  let generated = 0;
  const maxGenerate = args.maxGenerate ?? MAX_GENERATE_PER_REQUEST;
  const moveByTicker = new Map<string, number>();
  for (const h of holdings) {
    const q = args.quotes[h.ticker];
    if (q?.regularMarketChangePercent != null) {
      moveByTicker.set(h.ticker.toUpperCase(), q.regularMarketChangePercent);
    }
  }

  const earningsEvents = await listCalendarEvents({
    types: ["earnings"],
    from: today,
    to: today,
    symbols: tickers.map((t) => t.toUpperCase()),
  });
  const earningsTodayCount = earningsEvents.length;

  for (const ev of earningsEvents) {
    if (generated >= maxGenerate) break;
    const ticker = ev.symbol?.toUpperCase() ?? "";
    if (!ticker) continue;
    if (args.forceRefreshTicker && ticker !== args.forceRefreshTicker.toUpperCase()) continue;

    const eventKey = earningsEventKey(ticker, today);
    let cached = await getAidNewsCacheEntry(args.userId, ticker, eventKey);
    if (!cached || args.forceRefreshTicker) {
      const web = await searchTavilyForTicker(`${ticker} earnings results ${today}`, 4);
      const usedWeb = web.length > 0;
      const webSnippets = web.map((w) => `${w.title}: ${w.content}`);
      const summary = await summarizeAidDigestItem({
        ticker,
        title: ev.name || `${ticker} earnings today`,
        excerpt:
          formatEarningsCalendarDetails(ev.details) || `${ticker} reports earnings today.`,
        source: "calendar",
        publishedAt: today,
        language: langName,
        kind: "earnings",
        webSnippets,
      });
      if (summary) {
        cached = await upsertAidNewsCache({
          userId: args.userId,
          ticker,
          eventKey,
          headline: summary.headline,
          summary,
          sources: web.map((w) => w.url),
          usedWeb,
          expiresAt: earningsExpiresAt(),
        });
        generated += 1;
      }
    }
  }

  const articles = await ensurePortfolioNews(tickers);
  const ranked = rankPortfolioNewsForTickers(
    articles.filter((a) => isWithin48h(a.publishedAt)),
    tickers,
  ).slice(0, 12);

  for (const article of ranked) {
    if (generated >= maxGenerate) break;
    const ticker = primaryTicker(article, tickers);
    const eventKey = articleEventKey(article);
    if (args.forceRefreshTicker && ticker.toUpperCase() !== args.forceRefreshTicker.toUpperCase()) continue;

    let cached = await getAidNewsCacheEntry(args.userId, ticker, eventKey);
    if (!cached || args.forceRefreshTicker) {
      const summary = await summarizeAidDigestItem({
        ticker,
        title: article.title,
        excerpt: article.summary || article.title,
        source: article.source,
        publishedAt: article.publishedAt,
        language: langName,
        kind: "news",
      });
      if (!summary) continue;
      const pct = moveByTicker.get(ticker.toUpperCase());
      const isBigMove = pct != null && Math.abs(pct) >= 3;
      const tags = [...summary.filterTags];
      if (isBigMove && !tags.includes("move")) tags.push("move");

      cached = await upsertAidNewsCache({
        userId: args.userId,
        ticker,
        eventKey,
        headline: summary.headline,
        summary: { ...summary, filterTags: tags },
        sources: [article.url],
        usedWeb: false,
        expiresAt: newsExpiresAt,
      });
      generated += 1;
    }
  }

  const cachedRows = await listAidNewsCacheForUser(args.userId, 60);
  const items: AidDigestItem[] = [];
  const seen = new Set<string>();
  const feedLimit = args.feedLimit ?? AID_DIGEST_FEED_LIMIT;
  const sinceVisit = args.sinceVisit ?? "";

  for (const row of cachedRows) {
    if (seen.has(row.eventKey)) continue;
    if (!isWithin48h(row.fetchedAt)) continue;
    seen.add(row.eventKey);
    const movePct = moveByTicker.get(row.ticker.toUpperCase()) ?? null;
    const item = cacheRowToItem(row, movePct);
    if (item) items.push(item);
  }

  if (items.length === 0 && ranked.length > 0) {
    for (const article of ranked.slice(0, 8)) {
      const ticker = primaryTicker(article, tickers);
      const pct = moveByTicker.get(ticker.toUpperCase());
      const tags: AidNewsFilterTag[] = ["news"];
      if (pct != null && Math.abs(pct) >= 3) tags.push("move");
      items.push(
        withDigestImpactScore({
          id: randomUUID(),
          ticker,
          movePct: pct ?? null,
          headline: article.title,
          bullets: [(article.summary || article.title).slice(0, 200)],
          impact: "medium",
          filterTags: tags,
          usedWeb: false,
          cachedAt: new Date().toISOString(),
          eventKey: articleEventKey(article),
        }),
      );
    }
  }

  for (const ev of earningsEvents) {
    const ticker = ev.symbol?.toUpperCase() ?? "";
    if (!ticker) continue;
    const eventKey = earningsEventKey(ticker, today);
    if (items.some((i) => i.eventKey === eventKey)) continue;
    items.push(
      withDigestImpactScore({
        id: randomUUID(),
        ticker,
        movePct: moveByTicker.get(ticker) ?? null,
        headline: ev.name || `${ticker} earnings today`,
        bullets: [
          (
            formatEarningsCalendarDetails(ev.details) ||
            `${ticker} reports earnings today.`
          ).slice(0, 240),
        ],
        impact: "medium",
        filterTags: ["earnings"],
        usedWeb: false,
        cachedAt: new Date().toISOString(),
        eventKey,
      }),
    );
  }

  let sorted = sortByImpactScore(items);
  if (sinceVisit) {
    sorted = [...sorted].sort((a, b) => {
      const aNew = a.cachedAt > sinceVisit;
      const bNew = b.cachedAt > sinceVisit;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return (b.impactScore ?? 0) - (a.impactScore ?? 0);
    });
  }

  const feed = sorted.slice(0, feedLimit);
  const newSinceVisitCount = sinceVisit
    ? sorted.filter((item) => item.cachedAt > sinceVisit).length
    : 0;

  return { items: feed, earningsTodayCount, newSinceVisitCount };
}
