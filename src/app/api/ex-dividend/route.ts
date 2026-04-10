import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { requireSession } from "@/lib/auth/guards";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import type { DividendEvent } from "@/lib/api-providers/types";
import { looksLikeIsin } from "@/lib/api-providers/isin-resolver";
import { YahooProvider } from "@/lib/api-providers/yahoo";
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

/** Premium dividend schedule: FMP or Alpha Vantage per {@link resolvePremiumStockDataProvider} (FMP when surface flag + key). */
async function fetchDividendsFromFallback(
  userId: string,
  tickers: string[],
): Promise<DividendEvent[]> {
  if (tickers.length === 0) return [];
  const out: DividendEvent[] = [];
  try {
    const resolved = await resolvePremiumStockDataProvider(userId, "dividends");
    if (resolved?.provider.getDividendSchedule) {
      const results = await Promise.allSettled(
        tickers.map((ticker) => resolved.provider.getDividendSchedule!(ticker)),
      );
      results.forEach((r) => {
        if (r.status === "fulfilled") out.push(...r.value);
      });
    }
  } catch (err) {
    console.error("[ex-dividend] Market data fallback failed:", err instanceof Error ? err.message : err);
  }
  return out;
}

/** Tickers that have at least one upcoming ex-dividend event (symbol match, case-insensitive). */
function tickersWithEvents(events: DividendEvent[], requested: string[]): Set<string> {
  const symbols = new Set(events.map((e) => e.symbol.toUpperCase()));
  const covered = new Set<string>();
  for (const t of requested) {
    if (symbols.has(t.toUpperCase())) covered.add(t.toUpperCase());
  }
  return covered;
}

function dedupeEvents(events: DividendEvent[]): DividendEvent[] {
  const seen = new Set<string>();
  const out: DividendEvent[] = [];
  for (const e of events) {
    const key = `${e.symbol.toUpperCase()}|${e.exDividendDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export const GET = withMetrics("/api/ex-dividend", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  void session;

  const url = new URL(req.url);
  const tickersParam = url.searchParams.get("tickers") || "";
  let tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  if (tickers.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const isinTickers = tickers.filter(looksLikeIsin);
  if (isinTickers.length > 0) {
    const yahoo = new YahooProvider();
    const resolved = await Promise.all(
      isinTickers.map(async (isin) => {
        try {
          const results = await yahoo.search(isin);
          return results.length > 0 ? { isin, ticker: results[0].symbol } : null;
        } catch { return null; }
      })
    );
    const isinMap = new Map(resolved.filter(Boolean).map((r) => [r!.isin, r!.ticker]));
    tickers = tickers.map((t) => isinMap.get(t) ?? t);
  }

  tickers = [...new Set(tickers)];

  let events: DividendEvent[] = [];

  try {
    events = await fetchDividendsFromYahoo(tickers);
  } catch (err) {
    console.warn("[ex-dividend] Yahoo failed:", err instanceof Error ? err.message : err);
  }

  const covered = tickersWithEvents(events, tickers);
  const missingTickers = tickers.filter((t) => !covered.has(t.toUpperCase()));

  if (missingTickers.length > 0) {
    const fallbackEvents = await fetchDividendsFromFallback(session.userId, missingTickers);
    events = events.concat(fallbackEvents);
  }

  events = dedupeEvents(events);
  events.sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate));
  return NextResponse.json({ events });
});
