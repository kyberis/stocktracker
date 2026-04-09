import { NextRequest } from "next/server";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

const VALID_FUNCTIONS = new Set([
  "REAL_GDP", "REAL_GDP_PER_CAPITA", "TREASURY_YIELD",
  "FEDERAL_FUNDS_RATE", "CPI", "INFLATION",
  "RETAIL_SALES", "DURABLES", "UNEMPLOYMENT", "NONFARM_PAYROLL",
]);

export const GET = withMetrics("/api/economic-indicators", async (request: NextRequest) => {
  const { error } = await requireFeatureAccess(request, "economic-indicators");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const func = searchParams.get("func");

  if (!func || !VALID_FUNCTIONS.has(func)) {
    return Response.json(
      { error: "func parameter required. Valid: " + [...VALID_FUNCTIONS].join(", ") },
      { status: 400 }
    );
  }

  const session = await getSessionFromRequest(request);
  const resolved = await resolvePremiumStockDataProvider(session?.userId ?? null, "economic_indicators");
  if (!resolved) {
    return Response.json(
      { error: "No market data API key configured. Ask your administrator to add FMP_API_KEY or Alpha Vantage." },
      { status: 503 }
    );
  }

  const { provider, backend } = resolved;
  if (!provider.getEconomicIndicator) {
    return Response.json({ error: "Economic indicators not available" }, { status: 503 });
  }

  const rl = await requireRateLimit(request, backend === "fmp" ? "fmp" : "alphavantage");
  if (rl.error) return rl.error;
  const rateLimitUserId = rl.session?.userId ?? null;

  const interval = searchParams.get("interval") || undefined;
  const maturity = searchParams.get("maturity") || undefined;

  try {
    const result = await provider.getEconomicIndicator(func, interval, maturity);

    if (!result || !result.data || result.data.length === 0) {
      return jsonWithCallCount(provider, { error: "No data available" }, { status: 404 });
    }

    return jsonWithCallCount(provider, result, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error(
      `Failed to fetch economic indicator ${func}:`,
      err instanceof Error ? err.message : err
    );
    return jsonWithCallCount(provider, { error: "Failed to fetch data" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordMarketDataUsageAsync(rateLimitUserId, backend, provider.callCount!));
    }
  }
});
