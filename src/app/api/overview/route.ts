import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/overview", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  try {
    const overview = await yahoo.getOverview!(symbol);
    if (overview) return Response.json(overview);
    return Response.json({ error: "No overview data available" }, { status: 404 });
  } catch (err) {
    console.error(`[overview] Failed for ${symbol}:`, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch overview data" }, { status: 500 });
  }
});
