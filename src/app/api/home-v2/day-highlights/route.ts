import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  getUserSettings,
  isFeatureEnabledForUser,
  listAlerts,
  listAidNewsCacheForUser,
  listCalendarEvents,
  listHoldings,
} from "@/lib/db";
import { parseAidDigestSummary } from "@/lib/db/aid-news-cache";
import { getQuotesWithCache } from "@/lib/quote-cache";
import { convertToEUR } from "@/lib/utils";
import { scoreDayHighlights } from "@/lib/homepage/score-day-highlights";
import { computeDigestImpactScore } from "@/lib/aid/impact-score";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";
import type { DayHighlightHoldingInput } from "@/lib/homepage/types";
import type { ExchangeRates } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/home-v2/day-highlights", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/day-highlights", reason: "no_session" });

  const enabled = await isFeatureEnabledForUser("home_v2", session.userId);
  if (!enabled) {
    return NextResponse.json({ error: "Home v2 is not enabled" }, { status: 403 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const [holdings, settings, alerts, newsRows] = await Promise.all([
    listHoldings(session.userId, portfolioId),
    getUserSettings(session.userId),
    listAlerts(session.userId),
    listAidNewsCacheForUser(session.userId, 40),
  ]);

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};

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

  return NextResponse.json({
    highlights,
    language: settings.language || "en",
    asOf: new Date().toISOString(),
  });
});
