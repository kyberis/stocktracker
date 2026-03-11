import YahooFinance from "yahoo-finance2";
import { withMetrics } from "@/lib/with-metrics";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { getTickerBySymbol, normalizeTicker } from "@/lib/api-providers/coinlore";
import { apiCache, CACHE_TTL } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const BATCH_TTL = 5 * 60 * 1000;
const BATCH_CACHE_KEY = "ticker-bar:batch";
const FX_CACHE_KEY = "ticker-bar:eurusd";
const BTC_CACHE_KEY = "ticker-bar:btc";

const BATCH_SYMBOLS = ["GC=F", "SI=F", "^GSPC", "CL=F"] as const;

interface QuoteSnapshot {
  price: number;
  changePercent: number;
}

type BatchResult = Record<string, QuoteSnapshot>;

const yahooFinance = new YahooFinance();

/**
 * In-flight promise deduplication: if a fetch is already running for a key,
 * subsequent callers await the same promise instead of firing a new upstream call.
 */
const inflight = new Map<string, Promise<unknown>>();

async function deduplicatedGetOrFetch<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  const cached = apiCache.get<T>(key);
  if (cached !== null) return cached;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetchFn().then((data) => {
    apiCache.set(key, data, ttl);
    inflight.delete(key);
    return data;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

export const GET = withMetrics("/api/ticker-bar", async () => {
  const [eurUsd, btc, batch] = await Promise.all([
    deduplicatedGetOrFetch(FX_CACHE_KEY, CACHE_TTL.AV_EXCHANGE_RATE, async () => {
      const rate = await new YahooProvider().getExchangeRate("EUR", "USD");
      return { rate, provider: "yahoo" as const };
    }),
    deduplicatedGetOrFetch(BTC_CACHE_KEY, CACHE_TTL.COINLORE_TICKERS, async () => {
      const raw = await getTickerBySymbol("BTC");
      if (!raw) return { priceUsd: 0, change24h: 0 };
      const t = normalizeTicker(raw);
      return { priceUsd: t.priceUsd, change24h: t.change24h };
    }),
    deduplicatedGetOrFetch<BatchResult>(BATCH_CACHE_KEY, BATCH_TTL, async () => {
      const quotes = await yahooFinance.quote(BATCH_SYMBOLS as unknown as string[]);
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      const result: BatchResult = {};
      for (const q of arr) {
        result[q.symbol ?? ""] = {
          price: q.regularMarketPrice ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      }
      return result;
    }),
  ]);

  return Response.json(
    {
      eurUsd,
      btc,
      gold: batch["GC=F"] ?? { price: 0, changePercent: 0 },
      silver: batch["SI=F"] ?? { price: 0, changePercent: 0 },
      sp500: batch["^GSPC"] ?? { price: 0, changePercent: 0 },
      oil: batch["CL=F"] ?? { price: 0, changePercent: 0 },
    },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } }
  );
});
