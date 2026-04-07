import { NextRequest, NextResponse } from "next/server";
import { upsertCalendarEventsBatch, deleteStaleEvents } from "@/lib/db";
import { getGlobalAlphaVantageApiKey } from "@/lib/db";
import {
  fetchEconomicCalendar,
  fetchIpoCalendar,
  fetchSplitsCalendar,
  type FmpEarningsEvent,
  type FmpEconomicEvent,
  type FmpIpoEvent,
} from "@/lib/api-providers/fmp";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Fetch earnings calendar from Alpha Vantage (CSV endpoint).
 * Returns parsed rows. Falls back to empty array on failure.
 */
async function fetchAvEarningsCalendar(apiKey: string, horizon: string = "3month"): Promise<FmpEarningsEvent[]> {
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=${horizon}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();

  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const symbolIdx = headers.indexOf("symbol");
  const nameIdx = headers.indexOf("name");
  const dateIdx = headers.indexOf("reportDate");
  const fiscalIdx = headers.indexOf("fiscalDateEnding");
  const estIdx = headers.indexOf("estimate");
  const currIdx = headers.indexOf("currency");

  const events: FmpEarningsEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (!cols[symbolIdx] || !cols[dateIdx]) continue;
    events.push({
      symbol: cols[symbolIdx].trim(),
      date: cols[dateIdx].trim(),
      eps: null,
      epsEstimated: estIdx >= 0 ? parseFloat(cols[estIdx]) || null : null,
      time: "--",
      revenue: null,
      revenueEstimated: null,
      fiscalDateEnding: fiscalIdx >= 0 ? cols[fiscalIdx].trim() : "",
      updatedFromDate: "",
    });
  }
  return events;
}

const runEventSync = withCronLogging("event-sync", async () => {
  const from = today();
  const to = addDays(from, 30);
  const fromStr = toISODate(from);
  const toStr = toISODate(to);

  const stats = { earnings: 0, economic: 0, ipo: 0, splits: 0, deleted: 0, errors: [] as string[] };

  // --- Earnings from Alpha Vantage ---
  const avKey = getGlobalAlphaVantageApiKey();
  if (avKey) {
    try {
      const raw = await fetchAvEarningsCalendar(avKey, "3month");
      const filtered = raw.filter((e) => e.date >= fromStr && e.date <= toStr);
      const mapped = filtered.map((e) => ({
        id: `earnings:${e.symbol}:${e.date}`,
        event_type: "earnings",
        symbol: e.symbol,
        name: e.symbol,
        event_date: e.date,
        event_time: e.time === "--" ? null : e.time,
        details: JSON.stringify({
          epsEstimated: e.epsEstimated,
          fiscalDateEnding: e.fiscalDateEnding,
        }),
      }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.earnings = mapped.length;
    } catch (e) {
      stats.errors.push(`earnings: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Earnings from FMP (supplement with time-of-day data) ---
  if (process.env.FMP_API_KEY) {
    try {
      const fmpEarnings = await fetchFmpEarnings(from, to);
      const mapped = fmpEarnings
        .filter((e) => e.date >= fromStr && e.date <= toStr && e.symbol)
        .map((e) => ({
          id: `earnings:${e.symbol}:${e.date}`,
          event_type: "earnings",
          symbol: e.symbol,
          name: e.symbol,
          event_date: e.date,
          event_time: e.time === "--" ? null : e.time,
          details: JSON.stringify({
            epsEstimated: e.epsEstimated,
            eps: e.eps,
            revenue: e.revenue,
            revenueEstimated: e.revenueEstimated,
            fiscalDateEnding: e.fiscalDateEnding,
          }),
        }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.earnings = Math.max(stats.earnings, mapped.length);
    } catch (e) {
      stats.errors.push(`fmp-earnings: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Economic events from FMP ---
  if (process.env.FMP_API_KEY) {
    try {
      const raw = await fetchEconomicCalendar(from, to);
      const mapped = raw
        .filter((e) => e.date >= fromStr && e.date <= toStr)
        .map((e) => ({
          id: `economic:${slugify(e.event)}:${e.date}`,
          event_type: "economic",
          symbol: null,
          name: e.event,
          event_date: e.date.slice(0, 10),
          event_time: e.date.length > 10 ? e.date.slice(11, 16) : null,
          details: JSON.stringify({
            country: e.country,
            actual: e.actual,
            previous: e.previous,
            estimate: e.estimate,
            change: e.change,
            changePercentage: e.changePercentage,
            impact: e.impact,
          }),
        }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.economic = mapped.length;
    } catch (e) {
      stats.errors.push(`economic: ${e instanceof Error ? e.message : String(e)}`);
    }

    // --- IPO calendar from FMP ---
    try {
      const raw = await fetchIpoCalendar(from, to);
      const mapped = raw
        .filter((e) => e.date >= fromStr && e.date <= toStr)
        .map((e) => ({
          id: `ipo:${e.symbol || slugify(e.company)}:${e.date}`,
          event_type: "ipo",
          symbol: e.symbol || null,
          name: e.company,
          event_date: e.date,
          event_time: null,
          details: JSON.stringify({
            exchange: e.exchange,
            priceRange: e.priceRange,
            shares: e.shares,
            marketCap: e.marketCap,
            actions: e.actions,
          }),
        }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.ipo = mapped.length;
    } catch (e) {
      stats.errors.push(`ipo: ${e instanceof Error ? e.message : String(e)}`);
    }

    // --- Stock splits from FMP ---
    try {
      const raw = await fetchSplitsCalendar(from, to);
      const mapped = raw
        .filter((e) => e.date >= fromStr && e.date <= toStr && e.symbol)
        .map((e) => {
          const isReverse = e.numerator < e.denominator;
          const ratio = `${e.numerator}:${e.denominator}`;
          return {
            id: `splits:${e.symbol}:${e.date}`,
            event_type: "splits",
            symbol: e.symbol,
            name: e.symbol,
            event_date: e.date,
            event_time: null,
            details: JSON.stringify({
              numerator: e.numerator,
              denominator: e.denominator,
              ratio,
              isReverse,
              splitType: e.splitType || (isReverse ? "Reverse" : "Forward"),
            }),
          };
        });

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.splits = mapped.length;
    } catch (e) {
      stats.errors.push(`splits: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Cleanup stale events (older than 7 days) ---
  const staleDate = toISODate(addDays(from, -7));
  stats.deleted = await deleteStaleEvents(staleDate);

  return {
    ok: true,
    synced: { earnings: stats.earnings, economic: stats.economic, ipo: stats.ipo, splits: stats.splits },
    deleted: stats.deleted,
    errors: stats.errors.length > 0 ? stats.errors : undefined,
  };
});

/**
 * Cron: sync event calendar data from Alpha Vantage (earnings) and FMP (economic + IPO).
 * Runs daily at 6 AM UTC. Stores 30 days of future events, removes stale entries.
 */
export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("event-sync", req.headers.get("authorization"));
  if (denied) return denied;
  return runEventSync();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function fetchFmpEarnings(from: Date, to: Date): Promise<FmpEarningsEvent[]> {
  const { fetchEarningsCalendar } = await import("@/lib/api-providers/fmp");
  return fetchEarningsCalendar(from, to);
}
