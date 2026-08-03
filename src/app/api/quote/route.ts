import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveYahooQuote } from "@/lib/resolve-yahoo-quote";
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
      try {
        const quote = await resolveYahooQuote(yahoo, symbol);
        if (quote) {
          results[symbol] = { ...quote, providerUsed: "yahoo" };
          toCache[symbol] = quote;
        } else {
          console.error(`Failed to fetch quote for ${symbol}: No quote data`);
          results[symbol] = errorQuote(symbol);
        }
      } catch (err) {
        console.error(`Failed to fetch quote for ${symbol}:`, err instanceof Error ? err.message : err);
        results[symbol] = errorQuote(symbol);
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
