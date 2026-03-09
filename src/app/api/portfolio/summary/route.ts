import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserByWidgetToken, findUserByDevicePasskey, markDeviceLinked, findUserById, listHoldings, listCashEntries } from "@/lib/db";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import { checkDeviceAuthRateLimit, getClientIp } from "@/lib/rate-limit";
import { deviceApiCalls } from "@/lib/metrics";
import type { ExchangeRates, QuoteData } from "@/lib/types";

const FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (session) return session.userId;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const ip = getClientIp(req);
    const rl = await checkDeviceAuthRateLimit(ip);
    if (!rl.allowed) return null;

    const token = auth.slice(7);
    const widgetUser = await findUserByWidgetToken(token);
    if (widgetUser) return widgetUser.id;
    const deviceUser = await findUserByDevicePasskey(token);
    if (deviceUser) {
      markDeviceLinked(deviceUser.id).catch(() => {});
      return deviceUser.id;
    }
  }
  return null;
}

export const GET = withMetrics("/api/portfolio/summary", async (req: NextRequest) => {
  const fwVersion = req.headers.get("x-firmware-version");
  if (fwVersion) {
    deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/portfolio/summary", status: "attempt" });
  }

  const userId = await resolveUserId(req);
  if (!userId) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/portfolio/summary", status: "auth_failed" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine portfolio scope from user's device_portfolio_id setting
  const dbUser = await findUserById(userId);
  const portfolioId = dbUser?.device_portfolio_id || undefined;

  const [holdings, cashEntries] = await Promise.all([
    listHoldings(userId, portfolioId),
    listCashEntries(userId, portfolioId),
  ]);

  if (holdings.length === 0 && cashEntries.length === 0) {
    let portfolioName = "All Portfolios";
    if (portfolioId) {
      const { findPortfolioById } = await import("@/lib/db");
      const portfolio = await findPortfolioById(userId, portfolioId);
      if (portfolio) portfolioName = portfolio.name;
    }
    return NextResponse.json({
      totalValueEUR: 0,
      costBasis: 0,
      dayChangeEUR: 0,
      dayChangePercent: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      holdingsCount: 0,
      topHoldings: [],
      portfolioName,
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

  // Determine portfolio name for device display
  let portfolioName = "All Portfolios";
  if (portfolioId) {
    const { findPortfolioById } = await import("@/lib/db");
    const portfolio = await findPortfolioById(userId, portfolioId);
    if (portfolio) portfolioName = portfolio.name;
  }

  const holdingValues = holdings.map((h) => {
    const q = quotes[h.ticker];
    const price = q?.regularMarketPrice ?? 0;
    const value = price > 0 ? h.shares * price : h.valueInEUR;
    return {
      ticker: h.ticker,
      name: h.name,
      value,
      dayChange: q?.regularMarketChangePercent ?? 0,
      shares: h.shares,
      price,
      currency: q?.currency ?? h.displayCurrency ?? "EUR",
    };
  });
  holdingValues.sort((a, b) => b.value - a.value);
  const totalVal = holdingValues.reduce((s, h) => s + h.value, 0);

  const full = req.nextUrl.searchParams.get("full") === "true";
  const sliced = full ? holdingValues.slice(0, 30) : holdingValues.slice(0, 5);
  const topHoldings = sliced.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    weight: totalVal > 0 ? Math.round((h.value / totalVal) * 1000) / 10 : 0,
    dayChange: Math.round(h.dayChange * 100) / 100,
    ...(full ? {
      shares: Math.round(h.shares * 1000) / 1000,
      price: Math.round(h.price * 100) / 100,
      currency: h.currency,
    } : {}),
  }));

  const dayChangePercent = totals.totalCurrentEUR > 0
    ? (totals.dayGainLossEUR / (totals.totalCurrentEUR - totals.dayGainLossEUR)) * 100
    : 0;

  return NextResponse.json({
    totalValueEUR: Math.round(totals.totalCurrentEUR * 100) / 100,
    costBasis: Math.round(totals.totalCostEUR * 100) / 100,
    dayChangeEUR: Math.round(totals.dayGainLossEUR * 100) / 100,
    dayChangePercent: Math.round(dayChangePercent * 100) / 100,
    totalGainLoss: Math.round(totals.totalGainLoss * 100) / 100,
    totalGainLossPercent: Math.round(totals.totalGainLossPercent * 100) / 100,
    holdingsCount: holdings.length,
    topHoldings,
    portfolioName,
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
