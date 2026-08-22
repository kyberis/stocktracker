import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserById, listHoldings, listCashEntries } from "@/lib/db";
import { computeDayChangeByType } from "@/lib/day-change-pct";
import { calculatePortfolioTotals, calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { investmentCashEntries } from "@/lib/portfolio-summary-cash";
import { buildByAssetTypeForWidget } from "@/lib/widget/build-by-asset-type";
import { withMetrics } from "@/lib/with-metrics";
import { deviceApiCalls } from "@/lib/metrics";
import { json401 } from "@/lib/log-unauthorized";
import {
  authenticateDeviceBearer,
  deviceBearerRateLimitResponse,
  type DeviceBearerMethod,
} from "@/lib/device-bearer-auth";
import type { ExchangeRates } from "@/lib/types";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { getRatesWithCache } from "@/lib/quote-cache";

type AuthMethod = "session" | DeviceBearerMethod;

interface AuthContext {
  userId: string | null;
  method: AuthMethod | null;
  rateLimited?: boolean;
  retryAfterSec?: number;
}

async function resolveAuthContext(req: NextRequest): Promise<AuthContext> {
  const session = await getSessionFromRequest(req);
  if (session) return { userId: session.userId, method: "session" };

  const bearer = await authenticateDeviceBearer(req);
  if (bearer.status === "ok") {
    return { userId: bearer.user.id, method: bearer.method };
  }
  if (bearer.status === "rate_limited") {
    return {
      userId: null,
      method: null,
      rateLimited: true,
      retryAfterSec: bearer.retryAfterSec,
    };
  }
  return { userId: null, method: null };
}

export const GET = withMetrics("/api/portfolio/summary", async (req: NextRequest) => {
  const fwVersion = req.headers.get("x-firmware-version");
  if (fwVersion) {
    deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/portfolio/summary", status: "attempt" });
  }

  const authContext = await resolveAuthContext(req);
  if (authContext.rateLimited) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/portfolio/summary", status: "rate_limited" });
    return deviceBearerRateLimitResponse(authContext.retryAfterSec);
  }
  if (!authContext.userId) {
    if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/portfolio/summary", status: "auth_failed" });
    return json401(req, {
      source: "api/portfolio/summary",
      reason: "auth_failed",
      tags: { hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const userId = authContext.userId;
  // Portfolio scope:
  // - Widget token always uses the user's configured device_portfolio_id (dynamic server-side control).
  // - Device passkey allows explicit ?portfolio= override, otherwise uses device_portfolio_id.
  // - Session requests only use explicit ?portfolio= (otherwise all portfolios).
  const portfolioParam = req.nextUrl.searchParams.get("portfolio");
  const explicitPortfolioId = portfolioParam && portfolioParam.trim() ? portfolioParam : undefined;
  const shouldLoadUserConfig =
    authContext.method === "widget_token" || authContext.method === "device_passkey";
  const dbUser = shouldLoadUserConfig ? await findUserById(userId) : null;

  let portfolioId: string | undefined;
  if (authContext.method === "widget_token") {
    portfolioId = dbUser?.device_portfolio_id || undefined;
  } else if (authContext.method === "device_passkey") {
    portfolioId = explicitPortfolioId || dbUser?.device_portfolio_id || undefined;
  } else {
    portfolioId = explicitPortfolioId;
  }

  const [holdings, allCashEntries] = await Promise.all([
    listHoldings(userId, portfolioId),
    listCashEntries(userId, portfolioId),
  ]);
  // Match dashboard net worth: investment cash only (exclude savings/pension/real estate).
  const cashEntries = investmentCashEntries(allCashEntries);

  if (holdings.length === 0 && cashEntries.length === 0) {
    let portfolioName = "All Portfolios";
    let emptyCurrency = "EUR";
    if (portfolioId) {
      const { findPortfolioById } = await import("@/lib/db");
      const portfolio = await findPortfolioById(userId, portfolioId);
      if (portfolio) {
        portfolioName = portfolio.name;
        emptyCurrency = portfolio.currency;
      }
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
      byAssetType: [],
      portfolioName,
      currency: emptyCurrency,
      updatedAt: new Date().toISOString(),
    });
  }

  // Same resolution path + shared cache as the dashboard/AID routes (ISIN
  // resolve, HK padding, DE/PA exchange fallbacks, Yahoo aliases), instead of
  // a bare per-symbol getQuote call that silently drops unresolved holdings
  // to stale valueInEUR and samples FX independently of the web.
  const quotes = await fetchQuoteMapForHoldings(holdings);

  // Resolve portfolio currency for base-currency conversion
  let portfolioCurrency = "EUR";
  let portfolioName = "All Portfolios";
  if (portfolioId) {
    const { findPortfolioById } = await import("@/lib/db");
    const portfolio = await findPortfolioById(userId, portfolioId);
    if (portfolio) {
      portfolioName = portfolio.name;
      portfolioCurrency = portfolio.currency;
    }
  }

  const fxPairs = buildNeededFxPairs([
    ...holdings.map((h) => h.displayCurrency),
    ...cashEntries.map((c) => c.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
    portfolioCurrency,
  ]);
  const fetchedRates = await getRatesWithCache(fxPairs);
  const exchangeRates: ExchangeRates = {};
  for (const [pair, rate] of Object.entries(fetchedRates)) {
    if (rate > 0) exchangeRates[pair] = rate;
  }

  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, portfolioCurrency);
  const byType = calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, portfolioCurrency);
  const dayChangeByType = computeDayChangeByType(
    holdings,
    quotes,
    exchangeRates,
    portfolioCurrency,
    undefined,
    cashEntries,
    {
      stock: byType.stock.totalCurrentEUR,
      etf: byType.etf.totalCurrentEUR,
      fund: byType.fund.totalCurrentEUR,
      crypto: byType.crypto.totalCurrentEUR,
      fixed_return: byType.fixed_return.totalCurrentEUR,
    },
  );
  const byAssetType = buildByAssetTypeForWidget(byType, dayChangeByType);

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

  // Legacy field names (*EUR): amounts are in `portfolioCurrency` (see calculatePortfolioTotals baseCurrency).
  return NextResponse.json({
    totalValueEUR: Math.round(totals.totalCurrentEUR * 100) / 100,
    costBasis: Math.round(totals.totalCostEUR * 100) / 100,
    dayChangeEUR: Math.round(totals.dayGainLossEUR * 100) / 100,
    dayChangePercent: Math.round(dayChangePercent * 100) / 100,
    totalGainLoss: Math.round(totals.totalGainLoss * 100) / 100,
    totalGainLossPercent: Math.round(totals.totalGainLossPercent * 100) / 100,
    holdingsCount: holdings.length,
    topHoldings,
    byAssetType,
    portfolioName,
    currency: portfolioCurrency,
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
