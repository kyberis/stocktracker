export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureAccess, requireRateLimit } from "@/lib/auth/guards";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import { getGlobalAlphaVantageApiKey } from "@/lib/db/settings";
import { evaluateMoat } from "@/lib/moat-evaluator";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/stock-evaluation", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "stock-evaluation");
  if (error || !session) return error;

  const rl = await requireRateLimit(request, "alphavantage");
  if (rl.error) return rl.error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const apiKey = getGlobalAlphaVantageApiKey();
  if (!apiKey) {
    return Response.json(
      { error: "Alpha Vantage API key not configured" },
      { status: 501 },
    );
  }

  const av = new AlphaVantageProvider(apiKey);

  try {
    const [overview, income, balance, cashflow, earnings] = await Promise.all([
      av.getOverview(symbol),
      av.getIncomeStatement(symbol),
      av.getBalanceSheet(symbol),
      av.getCashFlow(symbol),
      av.getEarnings(symbol),
    ]);

    if (!overview) {
      return Response.json({ error: `No fundamental data available for ${symbol}. Alpha Vantage may not cover this ticker — try a larger-cap stock (e.g. AAPL, KO, MSFT).` }, { status: 404 });
    }
    if (!income || !balance || !cashflow || !earnings) {
      return Response.json(
        { error: `Insufficient fundamental data for ${symbol}. Alpha Vantage has partial coverage — income statements, balance sheet, or earnings data is missing.` },
        { status: 404 },
      );
    }

    const evaluation = evaluateMoat({ overview, income, balance, cashflow, earnings });

    return Response.json(evaluation, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[stock-evaluation] Error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch evaluation data" }, { status: 500 });
  }
});
