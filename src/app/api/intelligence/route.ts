import { NextRequest } from "next/server";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getPremiumMarketDataFromRequest } from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["news", "insider", "institutional", "transcript"]);

export const GET = withMetrics("/api/intelligence", async (request: NextRequest) => {
  const { error } = await requireFeatureAccess(request, "intelligence");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type");

  if (!symbol || !type || !VALID_TYPES.has(type)) {
    return Response.json(
      { error: "symbol and type (news|insider|institutional|transcript) parameters required" },
      { status: 400 }
    );
  }

  const resolved = await getPremiumMarketDataFromRequest(request, "intelligence");

  if (!resolved) {
    return Response.json(
      { error: "Premium market data requires Pro and a configured market data API key" },
      { status: 400 }
    );
  }

  const { provider, backend } = resolved;

  const rl = await requireRateLimit(request, backend === "fmp" ? "fmp" : "alphavantage");
  if (rl.error) return rl.error;
  const rateLimitUserId = rl.session?.userId ?? null;

  const methodMap: Record<string, string> = {
    news: "getNewsSentiment",
    insider: "getInsiderTransactions",
    institutional: "getInstitutionalHoldings",
    transcript: "getEarningsTranscript",
  };

  const methodName = methodMap[type];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const method = (provider as any)[methodName];

  if (typeof method !== "function") {
    return Response.json(
      { error: `${type} data not available` },
      { status: 400 }
    );
  }

  try {
    let result: unknown;
    if (type === "transcript") {
      const quarter = searchParams.get("quarter");
      if (!quarter) {
        return Response.json({ error: "quarter parameter required for transcript" }, { status: 400 });
      }
      result = await (method as (s: string, q: string) => Promise<unknown>).call(provider, symbol, quarter);
    } else {
      result = await (method as (s: string) => Promise<unknown>).call(provider, symbol);
    }

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return jsonWithCallCount(provider, { error: "No data available" }, { status: 404 });
    }

    return jsonWithCallCount(provider, result);
  } catch (err) {
    console.error(
      `Failed to fetch ${type} for ${symbol}:`,
      err instanceof Error ? err.message : err
    );
    return jsonWithCallCount(provider, { error: "Failed to fetch data" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordMarketDataUsageAsync(rateLimitUserId, backend, provider.callCount!));
    }
  }
});
