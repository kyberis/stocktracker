import { NextRequest } from "next/server";
import type { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import type { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import {
  getTopCryptoTickers,
  getTickerBySymbol,
  normalizeTicker,
  type NormalizedCryptoTicker,
} from "@/lib/api-providers/coinlore";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getSessionFromRequest } from "@/lib/auth/session";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";
import { apiCache, CACHE_TTL } from "@/lib/api-cache";
import { CRYPTO_PAGE_SUPPORTED_SYMBOLS } from "@/lib/crypto-page-symbols";

export const dynamic = "force-dynamic";

type CryptoPd = AlphaVantageProvider | FmpMarketDataProvider;

type CryptoAction = "tickers" | "detail" | "history" | "exchange-rates";

const VALID_SYMBOLS = CRYPTO_PAGE_SUPPORTED_SYMBOLS;

const VALID_RANGES = new Set(["1m", "3m", "1y", "all"]);

export const GET = withMetrics("/api/crypto", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = (searchParams.get("action") || "tickers") as CryptoAction;
  const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();
  const market = searchParams.get("market") || "EUR";

  if (action === "tickers") {
    return handleTickers();
  }

  if (action === "detail") {
    return handleDetail(symbol);
  }

  if (action === "history" || action === "exchange-rates") {
    const { error } = await requireFeatureAccess(request, "crypto-pro");
    if (error) return error;

    if (action === "history") {
      const range = searchParams.get("range") || "1y";
      if (!VALID_RANGES.has(range)) {
        return Response.json({ error: "Invalid range" }, { status: 400 });
      }
      return handleHistory(request, symbol, market, range);
    }

    return handleExchangeRates(request, symbol);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
});

async function handleTickers(): Promise<Response> {
  const cacheKey = "crypto:tickers:top";
  const tickers = await apiCache.getOrFetch<NormalizedCryptoTicker[]>(
    cacheKey,
    CACHE_TTL.COINLORE_TICKERS,
    async () => {
      const raw = await getTopCryptoTickers();
      return raw.map(normalizeTicker);
    }
  );

  return Response.json(
    { tickers },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } }
  );
}

async function handleDetail(symbol: string): Promise<Response> {
  if (!VALID_SYMBOLS.has(symbol)) {
    return Response.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  const cacheKey = `crypto:detail:${symbol}`;
  const ticker = await apiCache.getOrFetch<NormalizedCryptoTicker | null>(
    cacheKey,
    CACHE_TTL.COINLORE_TICKERS,
    async () => {
      const raw = await getTickerBySymbol(symbol);
      return raw ? normalizeTicker(raw) : null;
    }
  );

  if (!ticker) {
    return Response.json({ error: "Coin not found" }, { status: 404 });
  }

  return Response.json(
    { ticker },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } }
  );
}

async function handleHistory(
  request: NextRequest,
  symbol: string,
  market: string,
  range: string
): Promise<Response> {
  if (!VALID_SYMBOLS.has(symbol)) {
    return Response.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  const resolved = await resolvePremiumStockDataProvider(session?.userId ?? null, "crypto");
  if (!resolved) {
    return Response.json(
      { error: "No market data API key configured" },
      { status: 503 }
    );
  }

  const { provider, backend } = resolved;
  const pd = provider as CryptoPd;

  const rl = await requireRateLimit(request, backend === "fmp" ? "fmp" : "alphavantage");
  if (rl.error) return rl.error;
  const rateLimitUserId = rl.session?.userId ?? null;

  const ttl = range === "all"
    ? CACHE_TTL.AV_CRYPTO_MONTHLY
    : range === "1y"
      ? CACHE_TTL.AV_CRYPTO_WEEKLY
      : CACHE_TTL.AV_CRYPTO_DAILY;

  const cacheKey = `crypto:history:${backend}:${symbol}:${market}:${range}`;

  try {
    const result = await apiCache.getOrFetch(cacheKey, ttl, async () => {
      if (range === "all") {
        return pd.getCryptoMonthly(symbol, market);
      }
      if (range === "1y") {
        const data = await pd.getCryptoDaily(symbol, market);
        const ts = "timeSeries" in data && Array.isArray(data.timeSeries) ? data.timeSeries : [];
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        const cutStr = cutoff.toISOString().slice(0, 10);
        return ts.filter((d: { date: string }) => d.date >= cutStr);
      }
      if (range === "3m") {
        const data = await pd.getCryptoDaily(symbol, market);
        const ts = "timeSeries" in data && Array.isArray(data.timeSeries) ? data.timeSeries : [];
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 3);
        const cutStr = cutoff.toISOString().slice(0, 10);
        return ts.filter((d: { date: string }) => d.date >= cutStr);
      }
      const data = await pd.getCryptoDaily(symbol, market);
      const ts = "timeSeries" in data && Array.isArray(data.timeSeries) ? data.timeSeries : [];
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      const cutStr = cutoff.toISOString().slice(0, 10);
      return ts.filter((d: { date: string }) => d.date >= cutStr);
    });

    const maxAge = range === "all" || range === "1y" ? 1800 : 900;
    return jsonWithCallCount(provider, { history: result }, {
      headers: { "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  } catch (err) {
    console.error(`Failed to fetch crypto history for ${symbol}:`, err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, { error: "Failed to fetch data" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordMarketDataUsageAsync(rateLimitUserId, backend, provider.callCount!));
    }
  }
}

async function handleExchangeRates(
  request: NextRequest,
  symbol: string
): Promise<Response> {
  if (!VALID_SYMBOLS.has(symbol)) {
    return Response.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  const resolved = await resolvePremiumStockDataProvider(session?.userId ?? null, "crypto");
  if (!resolved) {
    return Response.json({ error: "No market data API key configured" }, { status: 503 });
  }

  const { provider, backend } = resolved;
  const pd = provider as CryptoPd;

  const rl = await requireRateLimit(request, backend === "fmp" ? "fmp" : "alphavantage");
  if (rl.error) return rl.error;
  const rateLimitUserId = rl.session?.userId ?? null;

  const currencies = ["EUR", "USD", "GBP", "JPY"];
  const cacheKey = `crypto:rates:${backend}:${symbol}`;

  try {
    const rates = await apiCache.getOrFetch(cacheKey, CACHE_TTL.AV_EXCHANGE_RATE, async () => {
      const results: Array<{ pair: string; rate: number; bid: number; ask: number }> = [];
      for (const cur of currencies) {
        const r = await pd.getCryptoExchangeRate(symbol, cur);
        results.push({ pair: `${symbol} / ${cur}`, rate: r.rate, bid: r.bid, ask: r.ask });
      }
      return results;
    });

    return jsonWithCallCount(provider, { rates }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error(`Failed to fetch exchange rates for ${symbol}:`, err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, { error: "Failed to fetch rates" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordMarketDataUsageAsync(rateLimitUserId, backend, provider.callCount!));
    }
  }
}
