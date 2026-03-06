import { NextRequest } from "next/server";
import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { isRateLimitError } from "@/lib/api-providers/market-data-helpers";
import { requireRateLimit } from "@/lib/auth/guards";
import { recordAvUsageAsync } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { deferTask } from "@/lib/task-runner";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/search", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 1) {
    return Response.json([]);
  }

  const provider = await getProviderFromRequest(request);

  let rateLimitUserId: string | null = null;
  if (provider.name === "alphavantage") {
    const rl = await requireRateLimit(request, "alphavantage");
    if (rl.error) return rl.error;
    rateLimitUserId = rl.session?.userId ?? null;
  }

  try {
    const results = await provider.search(query);
    return jsonWithCallCount(provider, results, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    if (provider.name === "alphavantage" && isRateLimitError(err)) {
      console.warn(`Alpha Vantage rate limit hit for search, falling back to Yahoo`);
      try {
        const yahoo = new YahooProvider();
        const results = await yahoo.search(query);
        return jsonWithCallCount(provider, results);
      } catch {
        return jsonWithCallCount(provider, []);
      }
    }
    console.error("Search failed:", err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, []);
  } finally {
    if (rateLimitUserId && provider.callCount) {
      deferTask(() => recordAvUsageAsync(rateLimitUserId, provider.callCount!));
    }
  }
});
