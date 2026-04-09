export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { getMoatCache, upsertMoatCache } from "@/lib/db/moat-cache";
import { evaluateMoat } from "@/lib/moat-evaluator";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const GET = withMetrics("/api/stock-evaluation", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "stock-evaluation");
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const fresh = searchParams.get("fresh") === "1";

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  if (!fresh) {
    const cached = await getMoatCache(symbol).catch(() => null);
    if (cached) {
      const evaluation = JSON.parse(cached.evaluationJson);
      evaluation._cached = true;
      evaluation._cachedAt = cached.updatedAt;
      evaluation._evaluatedAt = cached.updatedAt;
      return Response.json(evaluation, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }
  }

  const resolved = await resolvePremiumStockDataProvider(session.userId, "fundamentals");
  if (!resolved) {
    return Response.json(
      { error: "Market data API not configured. Ask your administrator to set FMP_API_KEY or Alpha Vantage." },
      { status: 501 },
    );
  }
  const { provider, backend } = resolved;

  const rl = await requireRateLimit(request, backend === "fmp" ? "fmp" : "alphavantage");
  if (rl.error) return rl.error;

  try {
    const [overview, income, balance, cashflow, earnings] = await Promise.all([
      provider.getOverview?.(symbol) ?? Promise.resolve(null),
      provider.getIncomeStatement?.(symbol) ?? Promise.resolve(null),
      provider.getBalanceSheet?.(symbol) ?? Promise.resolve(null),
      provider.getCashFlow?.(symbol) ?? Promise.resolve(null),
      provider.getEarnings?.(symbol) ?? Promise.resolve(null),
    ]);

    if (!overview) {
      return Response.json(
        {
          error: `No fundamental data available for ${symbol}. Try a larger-cap liquid ticker (e.g. AAPL, KO, MSFT).`,
        },
        { status: 404 },
      );
    }
    if (!income || !balance || !cashflow || !earnings) {
      return Response.json(
        {
          error: `Insufficient fundamental data for ${symbol}. Income statement, balance sheet, cash flow, or earnings data is missing.`,
        },
        { status: 404 },
      );
    }

    const evaluation = evaluateMoat({ overview, income, balance, cashflow, earnings });
    const enriched = { ...evaluation, _evaluatedAt: new Date().toISOString().replace("T", " ").slice(0, 19) };

    upsertMoatCache(evaluation).catch((err) => {
      console.error("[stock-evaluation] Cache write failed:", err instanceof Error ? err.message : err);
    });

    return jsonWithCallCount(provider, enriched, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[stock-evaluation] Error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch evaluation data" }, { status: 500 });
  } finally {
    if (session.userId && provider.callCount) {
      deferTask(() => recordMarketDataUsageAsync(session.userId, backend, provider.callCount!));
    }
  }
});
