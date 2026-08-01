import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserById, getGlobalAlphaVantageApiKey, getGlobalFmpApiKey } from "@/lib/db";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { checkPublicSearchRateLimit, getClientIp } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

async function fallbackToYahooSearch(query: string) {
  try {
    return await yahoo.search(query);
  } catch {
    return [];
  }
}

export const GET = withMetrics("/api/search", async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    const rl = await checkPublicSearchRateLimit(getClientIp(request));
    if (!rl.allowed) {
      return Response.json(
        { error: "Too many requests, please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  /** Premium symbol search for moat evaluation (FMP or Alpha Vantage — server-chosen). */
  const premiumSearch = searchParams.get("premiumSearch") === "1";
  const wantsCrypto = searchParams.get("includeCrypto") === "true";

  if (!query || query.length < 1) {
    return Response.json([]);
  }

  if (premiumSearch) {
    if (!getGlobalAlphaVantageApiKey() && !getGlobalFmpApiKey()) {
      const fallback = await fallbackToYahooSearch(query);
      return Response.json(fallback);
    }
    const session = await getSessionFromRequest(request);
    const resolved = await resolvePremiumStockDataProvider(session?.userId ?? null, "search");
    if (!resolved) {
      const fallback = await fallbackToYahooSearch(query);
      return Response.json(fallback);
    }
    try {
      const results = await resolved.provider.search(query);
      if (!Array.isArray(results) || results.length === 0) {
        const fallback = await fallbackToYahooSearch(query);
        return Response.json(fallback, {
          headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
        });
      }
      return Response.json(results, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    } catch (err) {
      console.error("Premium search failed:", err instanceof Error ? err.message : err);
      const fallback = await fallbackToYahooSearch(query);
      return Response.json(fallback);
    }
  }

  let includeCrypto = false;
  if (wantsCrypto) {
    const session = await getSessionFromRequest(request);
    if (session) {
      const user = await findUserById(session.userId);
      includeCrypto = user?.plan === "pro";
    }
  }

  const searchOptions = includeCrypto ? { includeCrypto: true } : undefined;

  try {
    const results = await yahoo.search(query, searchOptions);
    return Response.json(results, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("Search failed:", err instanceof Error ? err.message : err);
    return Response.json([]);
  }
});
