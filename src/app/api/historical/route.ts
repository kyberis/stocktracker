import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { TimePeriod } from "@/lib/api-providers/types";

export const dynamic = "force-dynamic";

const DE_FALLBACK_SUFFIXES = [".F", ".DU", ".MU"];

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

async function tryGermanHistoricalFallback(
  yahoo: YahooProvider,
  symbol: string,
  period: TimePeriod
) {
  if (!symbol.toUpperCase().endsWith(".DE")) return null;
  const base = symbol.slice(0, -3);
  for (const suffix of DE_FALLBACK_SUFFIXES) {
    try {
      const data = await yahoo.getHistorical(`${base}${suffix}`, period);
      if (data.length > 0) return data;
    } catch {
      // try next
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = (searchParams.get("period") || "1m") as TimePeriod;

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const provider = getProviderFromRequest(request);
  const yahoo = new YahooProvider();

  try {
    const data = await provider.getHistorical(symbol, period);
    if (data.length > 0) {
      return jsonWithCallCount(provider, { data, providerUsed: provider.name });
    }
    const fb = await tryGermanHistoricalFallback(yahoo, symbol, period);
    if (fb) return jsonWithCallCount(provider, { data: fb, providerUsed: provider.name });
    return jsonWithCallCount(provider, { data, providerUsed: provider.name });
  } catch (err) {
    if (provider.name === "alphavantage" && isRateLimitError(err)) {
      console.warn(`Alpha Vantage rate limit hit for historical ${symbol}, falling back to Yahoo`);
    }

    try {
      const data = await yahoo.getHistorical(symbol, period);
      if (data.length > 0) {
        return jsonWithCallCount(provider, { data, providerUsed: "yahoo" });
      }
    } catch {
      // primary Yahoo failed, try German fallback
    }

    const fb = await tryGermanHistoricalFallback(yahoo, symbol, period);
    if (fb) return jsonWithCallCount(provider, { data: fb, providerUsed: "yahoo" });

    console.error(`Failed to fetch historical data for ${symbol}:`, err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, { error: "Failed to fetch historical data" }, { status: 500 });
  }
}
