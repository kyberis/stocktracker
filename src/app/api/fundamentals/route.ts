import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["income", "balance", "cashflow", "earnings"]);

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

  let rateLimitUserId: string | null = null;
  if (provider.name === "alphavantage") {
    const rl = await requireRateLimit(request, "alphavantage");
    if (rl.error) return rl.error;
    rateLimitUserId = rl.session?.userId ?? null;
  }

  const methodMap: Record<string, string> = {
    income: "getIncomeStatement",
    balance: "getBalanceSheet",
    cashflow: "getCashFlow",
    earnings: "getEarnings",
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
    const result = await (method as (s: string) => Promise<unknown>).call(provider, symbol);
    if (!result) {
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
      deferTask(() => recordAvUsageAsync(rateLimitUserId, provider.callCount!));
    }
  }
});
