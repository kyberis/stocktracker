import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { DE_FALLBACK_SUFFIXES, PA_FALLBACK_SUFFIXES } from "@/lib/api-providers/market-data-helpers";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { withMetrics } from "@/lib/with-metrics";
import { getCachedQuotes, setCachedQuotes } from "@/lib/quote-cache";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function errorQuote(symbol: string) {
  return {
    symbol,
    shortName: symbol,
    regularMarketPrice: 0,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency: "USD",
    regularMarketPreviousClose: 0,
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
    marketCap: 0,
    trailingAnnualDividendRate: undefined,
    trailingAnnualDividendYield: undefined,
    error: true,
  };
}

async function tryExchangeFallback(
  yahoo: YahooProvider,
  symbol: string
): Promise<{ quote: Awaited<ReturnType<YahooProvider["getQuote"]>>; usedSymbol: string } | null> {
  const upper = symbol.toUpperCase();
  let suffixes: string[] | null = null;
  let baseLen = 0;

  if (upper.endsWith(".DE")) {
    suffixes = DE_FALLBACK_SUFFIXES;
    baseLen = 3;
  } else if (upper.endsWith(".PA")) {
    suffixes = PA_FALLBACK_SUFFIXES;
    baseLen = 3;
  }

  if (!suffixes) return null;

  const base = symbol.slice(0, -baseLen);
  for (const suffix of suffixes) {
    try {
      const q = await yahoo.getQuote(`${base}${suffix}`);
      if (q.regularMarketPrice > 0) {
        return { quote: q, usedSymbol: `${base}${suffix}` };
      }
    } catch {
      // try next
    }
  }
  return null;
}

export const GET = withMetrics("/api/quote", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return Response.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const stockSymbols = symbols.split(",").map((s) => s.trim()).filter(Boolean);
  const results: Record<string, unknown> = {};

  const { hits, misses } = await getCachedQuotes(stockSymbols);
  for (const [symbol, quote] of Object.entries(hits)) {
    results[symbol] = { ...quote, providerUsed: "yahoo" };
  }

  if (misses.length > 0) {
    const yahoo = new YahooProvider();
    const toCache: Record<string, ProviderQuoteResult> = {};

    const stockPromises = misses.map(async (symbol) => {
      const resolved = await resolveIsinToTicker(yahoo, symbol);
      const ticker = resolved.includes(" ") ? resolved.replace(/\s+/g, "-") : resolved;
      try {
        const quote = await yahoo.getQuote(ticker);
        if (quote.regularMarketPrice > 0) {
          const q = { ...quote, symbol };
          results[symbol] = { ...q, providerUsed: "yahoo" };
          toCache[symbol] = q;
        } else {
          const fb = await tryExchangeFallback(yahoo, ticker);
          if (fb) {
            const resolved = { ...fb.quote, symbol };
            results[symbol] = { ...resolved, providerUsed: "yahoo" };
            toCache[symbol] = resolved;
          } else {
            results[symbol] = { ...quote, symbol, providerUsed: "yahoo" };
          }
        }
      } catch (err) {
        const fb = await tryExchangeFallback(yahoo, ticker).catch(() => null);
        if (fb) {
          const resolved = { ...fb.quote, symbol };
          results[symbol] = { ...resolved, providerUsed: "yahoo" };
          toCache[symbol] = resolved;
        } else {
          console.error(`Failed to fetch quote for ${symbol}:`, err instanceof Error ? err.message : err);
          results[symbol] = errorQuote(symbol);
        }
      }
    });

    await Promise.all(stockPromises);

    if (Object.keys(toCache).length > 0) {
      setCachedQuotes(toCache).catch(() => {});
    }
  }

  return Response.json(results, {
    headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
  });
});
