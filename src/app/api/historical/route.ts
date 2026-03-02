import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { TimePeriod } from "@/lib/api-providers/types";

export const dynamic = "force-dynamic";

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = (searchParams.get("period") || "1m") as TimePeriod;

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const provider = getProviderFromRequest(request);

  try {
    const data = await provider.getHistorical(symbol, period);
    return jsonWithCallCount(provider, { data, providerUsed: provider.name });
  } catch (err) {
    if (provider.name === "alphavantage" && isRateLimitError(err)) {
      console.warn(`Alpha Vantage rate limit hit for historical ${symbol}, falling back to Yahoo`);
      try {
        const yahoo = new YahooProvider();
        const data = await yahoo.getHistorical(symbol, period);
        return jsonWithCallCount(provider, { data, providerUsed: "yahoo" });
      } catch (fallbackErr) {
        console.error(`Yahoo fallback failed for historical ${symbol}:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        return jsonWithCallCount(provider, { error: "Failed to fetch historical data" }, { status: 500 });
      }
    }
    console.error(`Failed to fetch historical data for ${symbol}:`, err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, { error: "Failed to fetch historical data" }, { status: 500 });
  }
}
