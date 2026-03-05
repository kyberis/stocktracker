import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { waitUntil } from "@vercel/functions";

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

  const provider = await getProviderFromRequest(request);

  if (provider.name !== "alphavantage") {
    return Response.json(
      { error: "Economic indicators require Alpha Vantage provider" },
      { status: 400 }
    );
  }

  if (typeof provider.getEconomicIndicator !== "function") {
    return Response.json(
      { error: "Economic indicators not available for this provider" },
      { status: 400 }
    );
  }

  const rl = await requireRateLimit(request, "alphavantage");
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
      waitUntil(recordAvUsageAsync(rateLimitUserId, provider.callCount));
    }
  }
});
