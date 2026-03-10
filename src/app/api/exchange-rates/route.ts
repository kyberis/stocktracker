import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/exchange-rates", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pairsParam = searchParams.get("pairs");

  if (!pairsParam) {
    return Response.json(
      { error: "pairs parameter required (e.g. EURUSD,EURGBP)" },
      { status: 400 }
    );
  }

  const pairs = pairsParam
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const results: Record<string, { rate: number; provider: string }> = {};

  const tasks = pairs.map(async (pair) => {
    const from = pair.substring(0, 3).toUpperCase();
    const to = pair.substring(3).toUpperCase();
    if (from.length !== 3 || to.length !== 3) {
      results[pair] = { rate: 0, provider: "none" };
      return;
    }

    try {
      const rate = await yahoo.getExchangeRate(from, to);
      results[pair] = { rate, provider: "yahoo" };
    } catch (err) {
      console.error(
        `FX rate fetch failed for ${pair}:`,
        err instanceof Error ? err.message : err
      );
      results[pair] = { rate: 0, provider: "none" };
    }
  });

  await Promise.all(tasks);

  return Response.json(results, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
});
