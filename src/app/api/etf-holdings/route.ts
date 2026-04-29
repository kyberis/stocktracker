import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/etf-holdings", async (request: NextRequest) => {
  const { error } = await requireFeatureQuota(request, "etf_holdings");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const ticker = await resolveIsinToTicker(yahoo, symbol);

  try {
    const result = await yahoo.getETFHoldings(ticker);
    if (result) return Response.json(result);
    return Response.json({ error: "Failed to fetch ETF holdings" }, { status: 500 });
  } catch (err) {
    console.error(`[etf-holdings] Failed for ${symbol}:`, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch ETF holdings" }, { status: 500 });
  }
});
