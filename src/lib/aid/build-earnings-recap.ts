import {
  getAidNewsCacheEntry,
  listAidEarningsRecapCache,
  parseAidDigestSummary,
  upsertAidNewsCache,
} from "@/lib/db/aid-news-cache";
import { listCalendarEvents, listHoldings } from "@/lib/db";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { summarizeAidDigestItem } from "@/lib/aid/summarize-digest";
import { withDigestImpactScore, sortByImpactScore } from "@/lib/aid/impact-score";
import { searchTavilyForTicker } from "@/lib/aid/tavily-search";
import {
  earningsEventKey,
  earningsExpiresAt,
  earningsReportWindow,
  reportDateFromEarningsEventKey,
} from "@/lib/aid/earnings-keys";
import { languageCodeToName } from "@/lib/languages";
import type { AidDigestItem, QuoteData } from "@/lib/types";
import type { CalendarEvent } from "@/lib/db/calendar-events";

const MAX_GENERATE_PER_REQUEST = 6;
const MAX_DISPLAY = 10;

function cacheRowToItem(
  row: Awaited<ReturnType<typeof getAidNewsCacheEntry>>,
  movePct: number | null,
): AidDigestItem | null {
  if (!row) return null;
  const summary = parseAidDigestSummary(row.summaryJson);
  if (!summary) return null;
  const tags = summary.filterTags.includes("earnings")
    ? summary.filterTags
    : (["earnings", ...summary.filterTags] as AidDigestItem["filterTags"]);
  return withDigestImpactScore({
    id: row.id,
    ticker: row.ticker,
    movePct,
    headline: summary.headline || row.headline,
    bullets: summary.bullets,
    impact: summary.impact,
    filterTags: tags,
    usedWeb: row.usedWeb,
    cachedAt: row.fetchedAt,
    eventKey: row.eventKey,
  });
}

function sortByReportDateDesc(a: AidDigestItem, b: AidDigestItem): number {
  const da = reportDateFromEarningsEventKey(a.eventKey) ?? "";
  const db = reportDateFromEarningsEventKey(b.eventKey) ?? "";
  return db.localeCompare(da);
}

async function generateEarningsSummary(args: {
  userId: string;
  ev: CalendarEvent;
  ticker: string;
  reportDate: string;
  language: string;
  movePct: number | null;
  force: boolean;
}): Promise<AidDigestItem | null> {
  const { userId, ev, ticker, reportDate, language, movePct, force } = args;
  const eventKey = earningsEventKey(ticker, reportDate);
  let cached = await getAidNewsCacheEntry(userId, ticker, eventKey);
  if (cached && !force) {
    return cacheRowToItem(cached, movePct);
  }

  const langName = languageCodeToName(language);
  const webQuery = `${ticker} earnings results ${reportDate} revenue EPS quarterly report`;
  const web = await searchTavilyForTicker(webQuery, 5);
  const usedWeb = web.length > 0;
  const webSnippets = web.map((w) => `${w.title}: ${w.content}`);

  const summary = await summarizeAidDigestItem({
    ticker,
    title: ev.name || `${ticker} earnings ${reportDate}`,
    excerpt:
      ev.details ||
      `${ticker} reported quarterly results around ${reportDate}. Summarize reported revenue, EPS, and guidance from sources only.`,
    source: usedWeb ? "web+calendar" : "calendar",
    publishedAt: reportDate,
    language: langName,
    kind: "earnings",
    webSnippets,
  });

  if (!summary) return null;

  const row = await upsertAidNewsCache({
    userId,
    ticker,
    eventKey,
    headline: summary.headline,
    summary: { ...summary, filterTags: ["earnings", ...(summary.filterTags.filter((t) => t !== "earnings"))] },
    sources: web.map((w) => w.url),
    usedWeb,
    expiresAt: earningsExpiresAt(),
  });

  return cacheRowToItem(row, movePct);
}

/**
 * Recent earnings reports for portfolio holdings — web search + AI summary, cached ~90 days.
 */
export async function buildAidEarningsRecap(args: {
  userId: string;
  portfolioId?: string;
  language: string;
  quotes: Record<string, QuoteData>;
  forceRefreshTicker?: string;
  maxGenerate?: number;
}): Promise<{ items: AidDigestItem[] }> {
  const holdings = await listHoldings(args.userId, args.portfolioId);
  if (holdings.length === 0) return { items: [] };

  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  if (tickers.length === 0) return { items: [] };

  const tickerSet = new Set(tickers.map((t) => t.toUpperCase()));
  const { from, to, today } = earningsReportWindow();

  const moveByTicker = new Map<string, number>();
  for (const h of holdings) {
    const q = args.quotes[h.ticker];
    if (q?.regularMarketChangePercent != null) {
      moveByTicker.set(h.ticker.toUpperCase(), q.regularMarketChangePercent);
    }
  }

  const calendarEvents = await listCalendarEvents({
    types: ["earnings"],
    from,
    to,
    symbols: [...tickerSet],
  });

  const reportEvents = calendarEvents
    .filter((ev) => {
      const sym = ev.symbol?.toUpperCase() ?? "";
      return sym && tickerSet.has(sym) && ev.event_date <= today;
    })
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  const byKey = new Map<string, AidDigestItem>();

  const cachedRows = await listAidEarningsRecapCache(args.userId, 30);
  for (const row of cachedRows) {
    const sym = row.ticker.toUpperCase();
    if (!tickerSet.has(sym)) continue;
    const reportDate = reportDateFromEarningsEventKey(row.eventKey);
    if (!reportDate || reportDate < from || reportDate > today) continue;
    const item = cacheRowToItem(row, moveByTicker.get(sym) ?? null);
    if (item) byKey.set(row.eventKey, item);
  }

  let generated = 0;
  const maxGenerate = args.maxGenerate ?? MAX_GENERATE_PER_REQUEST;
  const forceTicker = args.forceRefreshTicker?.toUpperCase();

  for (const ev of reportEvents) {
    if (generated >= maxGenerate) break;
    const ticker = ev.symbol!.toUpperCase();
    if (forceTicker && ticker !== forceTicker) continue;

    const eventKey = earningsEventKey(ticker, ev.event_date);
    const hasCached = byKey.has(eventKey);
    if (hasCached && !forceTicker) continue;

    const item = await generateEarningsSummary({
      userId: args.userId,
      ev,
      ticker,
      reportDate: ev.event_date,
      language: args.language,
      movePct: moveByTicker.get(ticker) ?? null,
      force: forceTicker === ticker,
    });
    if (item) {
      byKey.set(eventKey, item);
      if (!hasCached) generated += 1;
    }
  }

  const items = sortByImpactScore([...byKey.values()]).slice(0, MAX_DISPLAY);
  return { items };
}
