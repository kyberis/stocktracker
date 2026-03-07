import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserByWidgetToken, listHoldings, listCashEntries } from "@/lib/db";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import type { ExchangeRates, QuoteData } from "@/lib/types";

const FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (session) return session.userId;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const user = await findUserByWidgetToken(token);
    if (user) return user.id;
  }
  return null;
}

export const GET = withMetrics("/api/portfolio/summary", async (req: NextRequest) => {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [holdings, cashEntries] = await Promise.all([
    listHoldings(userId),
    listCashEntries(userId),
  ]);

  if (holdings.length === 0 && cashEntries.length === 0) {
    return NextResponse.json({
      totalValueEUR: 0,
      dayChangeEUR: 0,
      dayChangePercent: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      holdingsCount: 0,
      topHoldings: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const yahoo = new YahooProvider();

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes: Record<string, QuoteData> = {};

  const quoteChunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 10) {
    quoteChunks.push(tickers.slice(i, i + 10));
  }
  for (const chunk of quoteChunks) {
    const results = await Promise.allSettled(
      chunk.map(async (t) => {
        const q = await yahoo.getQuote(t);
        return { ticker: t, quote: q };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        quotes[r.value.ticker] = r.value.quote;
      }
    }
  }

  const exchangeRates: ExchangeRates = {};
  const rateResults = await Promise.allSettled(
    FX_PAIRS.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    })
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }

  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);

  const holdingValues = holdings.map((h) => {
    const q = quotes[h.ticker];
    const value = q && q.regularMarketPrice > 0
      ? h.shares * q.regularMarketPrice
      : h.valueInEUR;
    return { ticker: h.ticker, name: h.name, value, dayChange: q?.regularMarketChangePercent ?? 0 };
  });
  holdingValues.sort((a, b) => b.value - a.value);
  const totalVal = holdingValues.reduce((s, h) => s + h.value, 0);
  const topHoldings = holdingValues.slice(0, 5).map((h) => ({
    ticker: h.ticker,
    name: h.name,
    weight: totalVal > 0 ? Math.round((h.value / totalVal) * 1000) / 10 : 0,
    dayChange: Math.round(h.dayChange * 100) / 100,
  }));

  const dayChangePercent = totals.totalCurrentEUR > 0
    ? (totals.dayGainLossEUR / (totals.totalCurrentEUR - totals.dayGainLossEUR)) * 100
    : 0;

  return NextResponse.json({
    totalValueEUR: Math.round(totals.totalCurrentEUR * 100) / 100,
    dayChangeEUR: Math.round(totals.dayGainLossEUR * 100) / 100,
    dayChangePercent: Math.round(dayChangePercent * 100) / 100,
    totalGainLoss: Math.round(totals.totalGainLoss * 100) / 100,
    totalGainLossPercent: Math.round(totals.totalGainLossPercent * 100) / 100,
    holdingsCount: holdings.length,
    topHoldings,
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
