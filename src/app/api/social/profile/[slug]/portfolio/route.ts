import { NextRequest, NextResponse } from "next/server";
import { getPublicProfileBySlug, listHoldings, listCashEntries } from "@/lib/db";
import { requireSocialEnabled } from "@/lib/social-gate";
import { calculatePortfolioTotals, computeAllocationByType } from "@/lib/portfolio-summary";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { ExchangeRates, QuoteData } from "@/lib/types";
import { buildNeededFxPairs } from "@/lib/fx-pairs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const gated = await requireSocialEnabled();
  if (gated) return gated;

  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (profile.socialVisibility === "private") {
    return NextResponse.json({ error: "Profile is private" }, { status: 403 });
  }

  if (!profile.sharePortfolioValue && !profile.shareHoldings) {
    return NextResponse.json({ error: "Portfolio sharing is disabled" }, { status: 403 });
  }

  const [holdings, cashEntries] = await Promise.all([
    listHoldings(profile.userId),
    listCashEntries(profile.userId),
  ]);

  if (holdings.length === 0 && cashEntries.length === 0) {
    return NextResponse.json({
      sharePortfolioValue: profile.sharePortfolioValue,
      shareHoldings: profile.shareHoldings,
      totalValue: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
    });
  }

  const yahoo = new YahooProvider();
  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes: Record<string, QuoteData> = {};

  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 10) chunks.push(tickers.slice(i, i + 10));
  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (t) => ({ ticker: t, quote: await yahoo.getQuote(t) })),
    );
    for (const r of results) {
      if (r.status === "fulfilled") quotes[r.value.ticker] = r.value.quote;
    }
  }

  const exchangeRates: ExchangeRates = {};
  const fxPairs = buildNeededFxPairs([
    ...holdings.map((h) => h.displayCurrency),
    ...cashEntries.map((c) => c.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);
  const rateResults = await Promise.allSettled(
    fxPairs.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      return { pair, rate: await yahoo.getExchangeRate(from, to) };
    }),
  );
  for (const r of rateResults) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }

  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, "EUR");
  const allocation = computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, "EUR");

  const response: Record<string, unknown> = {
    sharePortfolioValue: profile.sharePortfolioValue,
    shareHoldings: profile.shareHoldings,
    holdingsCount: holdings.length,
  };

  if (profile.sharePortfolioValue) {
    const dayChangePercent = totals.totalCurrentEUR > 0
      ? (totals.dayGainLossEUR / (totals.totalCurrentEUR - totals.dayGainLossEUR)) * 100
      : 0;

    response.totalValue = Math.round(totals.totalCurrentEUR * 100) / 100;
    response.totalGainLoss = Math.round(totals.totalGainLoss * 100) / 100;
    response.totalGainLossPercent = Math.round(totals.totalGainLossPercent * 100) / 100;
    response.dayChange = Math.round(totals.dayGainLossEUR * 100) / 100;
    response.dayChangePercent = Math.round(dayChangePercent * 100) / 100;
  }

  if (profile.shareHoldings) {
    const holdingValues = holdings.map((h) => {
      const q = quotes[h.ticker];
      const price = q?.regularMarketPrice ?? 0;
      const value = price > 0 ? h.shares * price : h.valueInEUR;
      return { ticker: h.ticker, name: h.name, value, assetType: h.assetType ?? "stock" };
    });
    holdingValues.sort((a, b) => b.value - a.value);
    const totalVal = holdingValues.reduce((s, h) => s + h.value, 0);

    response.topHoldings = holdingValues.slice(0, 15).map((h) => ({
      ticker: h.ticker,
      name: h.name,
      weight: totalVal > 0 ? Math.round((h.value / totalVal) * 1000) / 10 : 0,
      assetType: h.assetType,
    }));
    response.allocation = allocation.filter((a) => a.percent > 0).map((a) => ({
      label: a.label,
      percent: Math.round(a.percent * 10) / 10,
      color: a.color,
    }));
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
