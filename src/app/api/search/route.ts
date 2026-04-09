import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserById, getGlobalAlphaVantageApiKey, getGlobalFmpApiKey } from "@/lib/db";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/search", async (request: NextRequest) => {
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
      return Response.json([]);
    }
    const session = await getSessionFromRequest(request);
    const resolved = await resolvePremiumStockDataProvider(session?.userId ?? null, "search");
    if (!resolved) return Response.json([]);
    try {
      const results = await resolved.provider.search(query);
      return Response.json(results, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    } catch (err) {
      console.error("Premium search failed:", err instanceof Error ? err.message : err);
      return Response.json([]);
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
