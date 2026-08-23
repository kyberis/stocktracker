import {
  getUserSettings,
  listAlerts,
  listAidNewsCacheForUser,
  listCalendarEvents,
  listHoldings,
} from "@/lib/db";
import { parseAidDigestSummary } from "@/lib/db/aid-news-cache";
import { fetchProviderQuotesForHoldings } from "@/lib/holding-quotes";
import { convertToEUR } from "@/lib/utils";
import { scoreDayHighlights } from "@/lib/homepage/score-day-highlights";
import { computeDigestImpactScore } from "@/lib/aid/impact-score";
import type { HomeDayHighlight, DayHighlightHoldingInput } from "@/lib/homepage/types";
import type { ExchangeRates, Holding } from "@/lib/types";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

export type DayHighlightsPayload = {
  highlights: HomeDayHighlight[];
  language: string;
  asOf: string;
};

/**
 * Score day highlights. Pass preloaded holdings + provider quotes to avoid
 * a second Yahoo fan-out when composing home bootstrap.
 */
export async function buildDayHighlightsPayload(args: {
  userId: string;
  portfolioId?: string;
  holdings?: Holding[];
  /** Provider quotes keyed by holding ticker (from fetchProviderQuotesForHoldings). */
  providerQuotes?: Record<string, ProviderQuoteResult>;
}): Promise<DayHighlightsPayload> {
  const [holdings, settings, alerts, newsRows] = await Promise.all([
    args.holdings
      ? Promise.resolve(args.holdings)
      : listHoldings(args.userId, args.portfolioId),
    getUserSettings(args.userId),
    listAlerts(args.userId),
    listAidNewsCacheForUser(args.userId, 40),
  ]);

  const quotes =
    args.providerQuotes ?? (await fetchProviderQuotesForHoldings(holdings));
  const tickers = [...new Set(holdings.map((h) => h.ticker))];

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setUTCDate(toDate.getUTCDate() + 14);
  const to = toDate.toISOString().slice(0, 10);

  const events =
    tickers.length > 0
      ? await listCalendarEvents({
          from,
          to,
          symbols: tickers,
          types: ["earnings", "splits"],
        })
      : [];

  const emptyRates: ExchangeRates = {};
  const holdingInputs: DayHighlightHoldingInput[] = holdings.map((h) => {
    const q = quotes[h.ticker];
    const price = q?.regularMarketPrice ?? null;
    const prev = q?.regularMarketPreviousClose ?? null;
    const pct = q?.regularMarketChangePercent ?? null;
    let eurDayImpact: number | null = null;
    if (price != null && prev != null && q) {
      const dayChange = (price - prev) * h.shares;
      eurDayImpact = convertToEUR(
        dayChange,
        q.currency || h.displayCurrency || "EUR",
        emptyRates,
      );
    }
    return {
      ticker: h.ticker,
      shares: h.shares,
      changePercent: pct,
      price,
      previousClose: prev,
      fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
      eurDayImpact,
    };
  });

  const eventInputs = events
    .filter((e) => e.symbol)
    .map((e) => ({
      ticker: e.symbol as string,
      type: e.event_type,
      date: e.event_date,
    }));

  const newsInputs = newsRows.flatMap((row) => {
    const summary = parseAidDigestSummary(row.summaryJson);
    if (!summary) return [];
    const impactScore = computeDigestImpactScore({
      impact: summary.impact,
      movePct: quotes[row.ticker]?.regularMarketChangePercent ?? null,
      filterTags: summary.filterTags ?? [],
    });
    return [
      {
        ticker: row.ticker,
        headline: row.headline || summary.headline,
        impactScore,
      },
    ];
  });

  const alertInputs = alerts
    .filter((a) => a.active && a.triggered && a.ticker)
    .map((a) => ({
      ticker: a.ticker,
      label: a.name || `${a.condition} ${a.threshold}`,
    }));

  const highlights = scoreDayHighlights({
    holdings: holdingInputs,
    events: eventInputs,
    news: newsInputs,
    alerts: alertInputs,
    today: from,
    limit: 8,
  });

  return {
    highlights,
    language: settings.language || "en",
    asOf: new Date().toISOString(),
  };
}
