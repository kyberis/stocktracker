import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getGlobalAlphaVantageApiKey } from "@/lib/db";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import type { DividendEvent } from "@/lib/api-providers/alphavantage";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/ex-dividend", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  void session;

  const url = new URL(req.url);
  const tickersParam = url.searchParams.get("tickers") || "";
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30); // cap to prevent abuse

  if (tickers.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const apiKey = getGlobalAlphaVantageApiKey();
  if (!apiKey) {
    return NextResponse.json({ events: [], error: "no_provider" });
  }

  const provider = new AlphaVantageProvider(apiKey);

  const results = await Promise.allSettled(
    tickers.map((ticker) => provider.getDividendSchedule(ticker))
  );

  const events: DividendEvent[] = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") {
      events.push(...r.value);
    }
  });

  // Sort by ex-dividend date ascending
  events.sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate));

  return NextResponse.json({ events });
});
