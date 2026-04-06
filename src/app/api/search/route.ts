import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserById, getGlobalAlphaVantageApiKey } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/search", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const provider = searchParams.get("provider");
  const wantsCrypto = searchParams.get("includeCrypto") === "true";

  if (!query || query.length < 1) {
    return Response.json([]);
  }

  if (provider === "alphavantage") {
    const apiKey = getGlobalAlphaVantageApiKey();
    if (!apiKey) return Response.json([]);
    try {
      const av = new AlphaVantageProvider(apiKey);
      const results = await av.search(query);
      return Response.json(results, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    } catch (err) {
      console.error("AV search failed:", err instanceof Error ? err.message : err);
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
