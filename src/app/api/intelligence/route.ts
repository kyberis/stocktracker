import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { waitUntil } from "@vercel/functions";

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

  const provider = await getProviderFromRequest(request);

  if (provider.name !== "alphavantage") {
    return Response.json(
      { error: "Alpha Intelligence data requires Alpha Vantage provider" },
      { status: 400 }
    );
  }

  const rl = await requireRateLimit(request, "alphavantage");
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
      { error: `${type} data not available for this provider` },
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
      waitUntil(recordAvUsageAsync(rateLimitUserId, provider.callCount));
    }
  }
});
