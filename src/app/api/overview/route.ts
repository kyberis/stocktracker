import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/overview", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const provider = await getProviderFromRequest(request);

  let rateLimitUserId: string | null = null;
  if (provider.name === "alphavantage") {
    const rl = await requireRateLimit(request, "alphavantage");
    if (rl.error) return rl.error;
    rateLimitUserId = rl.session?.userId ?? null;
  }

  try {
    if (provider.getOverview) {
      const overview = await provider.getOverview(symbol);
      if (overview) return jsonWithCallCount(provider, overview);
    }
    throw new Error("No data from primary provider");
  } catch (err) {
    if (provider.name === "alphavantage") {
      console.warn(`[overview] AV failed for ${symbol}, falling back to Yahoo:`, err instanceof Error ? err.message : err);
      try {
        const yahoo = new YahooProvider();
        const fallback = await yahoo.getOverview!(symbol);
        if (fallback) return Response.json({ ...fallback, providerUsed: "yahoo" });
      } catch (yahooErr) {
        console.error(`[overview] Yahoo fallback also failed for ${symbol}:`, yahooErr instanceof Error ? yahooErr.message : yahooErr);
      }
    }
    return jsonWithCallCount(provider, { error: "Failed to fetch overview data" }, { status: 500 });
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordAvUsageAsync(rateLimitUserId, provider.callCount!));
    }
  }
});
