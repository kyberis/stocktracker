import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["income", "balance", "cashflow", "earnings"]);

const METHOD_MAP: Record<string, string> = {
  income: "getIncomeStatement",
  balance: "getBalanceSheet",
  cashflow: "getCashFlow",
  earnings: "getEarnings",
};

export const GET = withMetrics("/api/fundamentals", async (request: NextRequest) => {
  const { error } = await requireFeatureAccess(request, "fundamentals");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type");

  if (!symbol || !type || !VALID_TYPES.has(type)) {
    return Response.json(
      { error: "symbol and type (income|balance|cashflow|earnings) parameters required" },
      { status: 400 }
    );
  }

  const provider = await getProviderFromRequest(request);
  const yahoo = new YahooProvider();

  let rateLimitUserId: string | null = null;
  let useProvider = provider;
  if (provider.name === "alphavantage") {
    const rl = await requireRateLimit(request, "alphavantage");
    if (rl.error) {
      useProvider = yahoo;
    } else {
      rateLimitUserId = rl.session?.userId ?? null;
    }
  }

  const methodName = METHOD_MAP[type];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const method = (useProvider as any)[methodName];
    if (typeof method === "function") {
      const result = await (method as (s: string) => Promise<unknown>).call(useProvider, symbol);
      if (result) return jsonWithCallCount(provider, result);
    }
    throw new Error("No data from primary provider");
  } catch (err) {
    if (useProvider.name === "alphavantage") {
      console.warn(`[fundamentals] AV failed for ${symbol}/${type}, falling back to Yahoo:`, err instanceof Error ? err.message : err);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const yahooMethod = (yahoo as any)[methodName];
        if (typeof yahooMethod === "function") {
          const fallback = await (yahooMethod as (s: string) => Promise<unknown>).call(yahoo, symbol);
          if (fallback) return Response.json(fallback);
        }
      } catch (yahooErr) {
        console.error(`[fundamentals] Yahoo fallback also failed for ${symbol}/${type}:`, yahooErr instanceof Error ? yahooErr.message : yahooErr);
      }
    }
    return jsonWithCallCount(provider, { error: "Failed to fetch data" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordAvUsageAsync(rateLimitUserId, provider.callCount!));
    }
  }
});
