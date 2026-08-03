import { getRedisClient } from "@/lib/upstash";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveYahooQuote } from "@/lib/resolve-yahoo-quote";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

const QUOTE_TTL = 30;
const FX_TTL = 60;

const inflightQuotes = new Map<string, Promise<ProviderQuoteResult>>();
const inflightRates = new Map<string, Promise<number>>();

// ---------------------------------------------------------------------------
// Cache read primitives
// ---------------------------------------------------------------------------

export async function getCachedQuotes(
  tickers: string[]
): Promise<{ hits: Record<string, ProviderQuoteResult>; misses: string[] }> {
  const redis = getRedisClient();
  if (!redis || tickers.length === 0) return { hits: {}, misses: tickers };

  try {
    const keys = tickers.map((t) => `quote:${t}`);
    const values = await redis.mget<(ProviderQuoteResult | null)[]>(...keys);
    const hits: Record<string, ProviderQuoteResult> = {};
    const misses: string[] = [];
    for (let i = 0; i < tickers.length; i++) {
      const v = values[i];
      if (v && typeof v === "object" && "regularMarketPrice" in v) {
        hits[tickers[i]] = v;
      } else {
        misses.push(tickers[i]);
      }
    }
    return { hits, misses };
  } catch (err) {
    console.error(
      "Redis getCachedQuotes failed, falling back:",
      err instanceof Error ? err.message : err
    );
    return { hits: {}, misses: tickers };
  }
}

export async function getCachedRates(
  pairs: string[]
): Promise<{ hits: Record<string, number>; misses: string[] }> {
  const redis = getRedisClient();
  if (!redis || pairs.length === 0) return { hits: {}, misses: pairs };

  try {
    const keys = pairs.map((p) => `fx:${p}`);
    const values = await redis.mget<(number | null)[]>(...keys);
    const hits: Record<string, number> = {};
    const misses: string[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const v = values[i];
      if (typeof v === "number") {
        hits[pairs[i]] = v;
      } else {
        misses.push(pairs[i]);
      }
    }
    return { hits, misses };
  } catch (err) {
    console.error(
      "Redis getCachedRates failed, falling back:",
      err instanceof Error ? err.message : err
    );
    return { hits: {}, misses: pairs };
  }
}

// ---------------------------------------------------------------------------
// Cache write primitives
// ---------------------------------------------------------------------------

export async function setCachedQuotes(
  results: Record<string, ProviderQuoteResult>
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const pipeline = redis.pipeline();
    for (const [symbol, data] of Object.entries(results)) {
      pipeline.set(`quote:${symbol}`, data, { ex: QUOTE_TTL });
    }
    await pipeline.exec();
  } catch (err) {
    console.error(
      "Redis setCachedQuotes failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function setCachedRate(
  pair: string,
  rate: number
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(`fx:${pair}`, rate, { ex: FX_TTL });
  } catch (err) {
    console.error(
      "Redis setCachedRate failed:",
      err instanceof Error ? err.message : err
    );
  }
}

// ---------------------------------------------------------------------------
// Coalescing helper — deduplicates concurrent in-flight fetches for the same key
// ---------------------------------------------------------------------------

function coalesce<T>(
  key: string,
  map: Map<string, Promise<T>>,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const promise = fetcher().finally(() => map.delete(key));
  map.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Full fetch-through helpers (cache → Yahoo → write-through)
// Used by server-side rendering in Phase 2; includes coalescing.
// ---------------------------------------------------------------------------

export async function getQuotesWithCache(
  tickers: string[]
): Promise<Record<string, ProviderQuoteResult>> {
  if (tickers.length === 0) return {};

  const { hits, misses } = await getCachedQuotes(tickers);
  if (misses.length === 0) return hits;

  const yahoo = new YahooProvider();
  const fetched: Record<string, ProviderQuoteResult> = {};

  await Promise.all(
    misses.map(async (symbol) => {
      try {
        const quote = await coalesce(symbol, inflightQuotes, async () => {
          const resolved = await resolveYahooQuote(yahoo, symbol);
          if (!resolved) {
            throw new Error(`No quote data for ${symbol}`);
          }
          return resolved;
        });
        fetched[symbol] = quote;
      } catch (err) {
        console.error(
          `Quote fetch failed for ${symbol}:`,
          err instanceof Error ? err.message : err
        );
      }
    })
  );

  if (Object.keys(fetched).length > 0) {
    setCachedQuotes(fetched).catch(() => {});
  }

  return { ...hits, ...fetched };
}

export async function getRatesWithCache(
  pairs: string[]
): Promise<Record<string, number>> {
  if (pairs.length === 0) return {};

  const { hits, misses } = await getCachedRates(pairs);
  if (misses.length === 0) return hits;

  const yahoo = new YahooProvider();
  const fetched: Record<string, number> = {};

  await Promise.all(
    misses.map(async (pair) => {
      const from = pair.substring(0, 3).toUpperCase();
      const to = pair.substring(3).toUpperCase();
      if (from.length !== 3 || to.length !== 3) return;

      try {
        const rate = await coalesce(pair, inflightRates, () =>
          yahoo.getExchangeRate(from, to)
        );
        fetched[pair] = rate;
      } catch (err) {
        console.error(
          `FX rate fetch failed for ${pair}:`,
          err instanceof Error ? err.message : err
        );
      }
    })
  );

  const redis = getRedisClient();
  if (redis && Object.keys(fetched).length > 0) {
    try {
      const pipeline = redis.pipeline();
      for (const [pair, rate] of Object.entries(fetched)) {
        pipeline.set(`fx:${pair}`, rate, { ex: FX_TTL });
      }
      await pipeline.exec();
    } catch {
      // non-critical — next request will try again
    }
  }

  return { ...hits, ...fetched };
}
