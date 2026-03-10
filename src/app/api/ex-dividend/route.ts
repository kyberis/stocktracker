import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { requireSession } from "@/lib/auth/guards";
import { getGlobalAlphaVantageApiKey } from "@/lib/db";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import type { DividendEvent } from "@/lib/api-providers/alphavantage";
import { withMetrics } from "@/lib/with-metrics";

const yahooFinance = new YahooFinance();

export const dynamic = "force-dynamic";

async function fetchDividendsFromYahoo(tickers: string[]): Promise<DividendEvent[]> {
  const events: DividendEvent[] = [];
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ["calendarEvents", "summaryDetail"],
      });
      const cal = summary.calendarEvents;
      const detail = summary.summaryDetail;
      const exDate = cal?.exDividendDate;
      if (!exDate) return null;

      const exStr = new Date(exDate).toISOString().slice(0, 10);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() + 90);
      const exParsed = new Date(exStr);
      if (exParsed < today || exParsed > cutoff) return null;

      return {
        symbol: ticker,
        exDividendDate: exStr,
        declarationDate: "",
        recordDate: "",
        paymentDate: cal?.dividendDate ? new Date(cal.dividendDate).toISOString().slice(0, 10) : "",
        amount: detail?.dividendRate ?? 0,
        currency: detail?.currency ?? "USD",
      } satisfies DividendEvent;
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) events.push(r.value);
  }
  return events;
}

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
    .slice(0, 30);

  if (tickers.length === 0) {
    return NextResponse.json({ events: [] });
  }

  let events: DividendEvent[] = [];

  try {
    events = await fetchDividendsFromYahoo(tickers);
  } catch (err) {
    console.warn("[ex-dividend] Yahoo failed:", err instanceof Error ? err.message : err);
  }

  if (events.length === 0) {
    const apiKey = getGlobalAlphaVantageApiKey();
    if (apiKey) {
      try {
        const provider = new AlphaVantageProvider(apiKey);
        const results = await Promise.allSettled(
          tickers.map((ticker) => provider.getDividendSchedule(ticker))
        );
        results.forEach((r) => {
          if (r.status === "fulfilled") events.push(...r.value);
        });
      } catch (err) {
        console.error("[ex-dividend] AV fallback also failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  events.sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate));
  return NextResponse.json({ events });
});
