import { NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { getQuotesWithCache } from "@/lib/quote-cache";

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
  const fetched = await getQuotesWithCache(stockSymbols);

  const results: Record<string, unknown> = {};
  for (const symbol of stockSymbols) {
    const quote = fetched[symbol];
    if (quote) {
      results[symbol] = { ...quote, providerUsed: "yahoo" };
    } else {
      results[symbol] = errorQuote(symbol);
    }
  }

  return Response.json(results, {
    headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
  });
});
