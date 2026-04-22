import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getPremiumMarketDataFromRequest } from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";
import type { StockDataProvider } from "@/lib/api-providers/types";

export const dynamic = "force-dynamic";

const IntelligenceTypeSchema = z.enum(["news", "insider", "institutional", "transcript"]);
type IntelligenceType = z.infer<typeof IntelligenceTypeSchema>;

type IntelligenceInvoker = (
  provider: StockDataProvider,
  symbol: string,
  quarter: string | null,
) => Promise<unknown> | null;

const INTELLIGENCE_INVOKERS: Record<IntelligenceType, IntelligenceInvoker> = {
  news: (provider, symbol) => provider.getNewsSentiment?.(symbol) ?? null,
  insider: (provider, symbol) => provider.getInsiderTransactions?.(symbol) ?? null,
  institutional: (provider, symbol) => provider.getInstitutionalHoldings?.(symbol) ?? null,
  transcript: (provider, symbol, quarter) =>
    quarter ? provider.getEarningsTranscript?.(symbol, quarter) ?? null : null,
};

export const GET = withMetrics("/api/intelligence", async (request: NextRequest) => {
  const { error } = await requireFeatureAccess(request, "intelligence");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const rawType = searchParams.get("type");
  const typeParse = IntelligenceTypeSchema.safeParse(rawType);

  if (!symbol || !typeParse.success) {
    return Response.json(
      { error: "symbol and type (news|insider|institutional|transcript) parameters required" },
      { status: 400 }
    );
  }

  const type = typeParse.data;

  if (type === "transcript" && !searchParams.get("quarter")) {
    return Response.json({ error: "quarter parameter required for transcript" }, { status: 400 });
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

  const invoker = INTELLIGENCE_INVOKERS[type];
  const quarter = searchParams.get("quarter");
  const invocation = invoker(provider, symbol, quarter);

  if (!invocation) {
    return Response.json(
      { error: `${type} data not available` },
      { status: 400 }
    );
  }

  try {
    const result = await invocation;

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
