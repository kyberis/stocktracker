import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureQuota, requireRateLimit } from "@/lib/auth/guards";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { fetchFinnhubCompanyNews } from "@/lib/api-providers/finnhub-news";
import { getSessionFromRequest } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/db";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
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
  const { error } = await requireFeatureQuota(request, "intelligence");
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

  const session = await getSessionFromRequest(request);
  if (session?.plan !== "pro") {
    return Response.json(
      { error: "Premium market data requires Pro and a configured market data API key" },
      { status: 400 }
    );
  }

  if (type === "transcript" && !(await isFeatureEnabled("fmp_earnings_transcripts"))) {
    return Response.json({ error: "No data available" }, { status: 404 });
  }

  const resolved = await resolvePremiumStockDataProvider(session.userId, "intelligence");

  if (!resolved) {
    const rl = await requireRateLimit(request, "fmp");
    if (rl.error) return rl.error;
    try {
      if (type === "news") {
        const apiKey = process.env.FINNHUB_API_KEY?.trim();
        const articles = apiKey ? await fetchFinnhubCompanyNews(symbol, apiKey) : [];
        if (articles.length === 0) {
          return Response.json({ error: "No data available" }, { status: 404 });
        }
        return Response.json(articles);
      }
      if (type === "transcript") {
        return Response.json({ error: "No data available" }, { status: 404 });
      }
      const yahoo = new YahooProvider();
      const result = type === "insider"
        ? await yahoo.getInsiderTransactions(symbol)
        : await yahoo.getInstitutionalHoldings(symbol);
      if (!result.length) {
        return Response.json({ error: "No data available" }, { status: 404 });
      }
      return Response.json(result);
    } catch (err) {
      console.error(
        `Failed to fetch ${type} for ${symbol}:`,
        err instanceof Error ? err.message : err,
      );
      return Response.json({ error: "Failed to fetch data" }, { status: 500 });
    }
  }

  const { provider, backend } = resolved;

  const rl = await requireRateLimit(request, "fmp");
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
