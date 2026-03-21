import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { TimePeriod } from "@/lib/api-providers/types";
import { DE_FALLBACK_SUFFIXES, PA_FALLBACK_SUFFIXES } from "@/lib/api-providers/market-data-helpers";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

async function tryExchangeHistoricalFallback(
  yahoo: YahooProvider,
  symbol: string,
  period: TimePeriod
) {
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
      const data = await yahoo.getHistorical(`${base}${suffix}`, period);
      if (data.length > 0) return data;
    } catch {
      // try next
    }
  }
  return null;
}

export const GET = withMetrics("/api/historical", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = (searchParams.get("period") || "1m") as TimePeriod;

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const yahoo = new YahooProvider();
  const ticker = await resolveIsinToTicker(yahoo, symbol);

  try {
    const data = await yahoo.getHistorical(ticker, period);
    if (data.length > 0) {
      return Response.json({ data, providerUsed: "yahoo" });
    }
    const fb = await tryExchangeHistoricalFallback(yahoo, ticker, period);
    if (fb) return Response.json({ data: fb, providerUsed: "yahoo" });
    return Response.json({ data, providerUsed: "yahoo" });
  } catch (err) {
    const fb = await tryExchangeHistoricalFallback(yahoo, ticker, period);
    if (fb) return Response.json({ data: fb, providerUsed: "yahoo" });

    console.error(`Failed to fetch historical data for ${symbol}:`, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch historical data" }, { status: 500 });
  }
});
