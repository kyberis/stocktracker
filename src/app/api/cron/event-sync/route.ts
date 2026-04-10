import { NextRequest, NextResponse } from "next/server";
import { upsertCalendarEventsBatch, deleteStaleEvents } from "@/lib/db";
import { getGlobalAlphaVantageApiKey, isFeatureEnabled } from "@/lib/db";
import type { FmpEarningsEvent } from "@/lib/api-providers/fmp";
import { syncFmpCalendarEventTypes } from "@/lib/market-data/fmp-calendar-sync";
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

/** How far ahead to sync FMP calendars (economic, IPO, splits) so a full month view has data. */
const SYNC_HORIZON_DAYS = 90;
/** Match deleteStaleEvents: keep roughly a week of past dates so early-in-month views still show data. */
const SYNC_PAST_DAYS = 7;

const runEventSync = withCronLogging("event-sync", async () => {
  const dayStart = today();
  const syncFrom = addDays(dayStart, -SYNC_PAST_DAYS);
  const syncTo = addDays(dayStart, SYNC_HORIZON_DAYS);
  const syncFromStr = toISODate(syncFrom);
  const syncToStr = toISODate(syncTo);

  const stats = { earnings: 0, economic: 0, ipo: 0, splits: 0, deleted: 0, errors: [] as string[] };

  // --- Earnings from Alpha Vantage (skipped when FMP-only rollout flag is on) ---
  const fmpEarningsOnly = await isFeatureEnabled("market_data_fmp_event_sync");
  const avKey = getGlobalAlphaVantageApiKey();
  if (!fmpEarningsOnly && avKey) {
    try {
      const raw = await fetchAvEarningsCalendar(avKey, "3month");
      const filtered = raw.filter((e) => e.date >= syncFromStr && e.date <= syncToStr);
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
      const fmpEarnings = await fetchFmpEarnings(syncFrom, syncTo);
      const mapped = fmpEarnings
        .filter((e) => e.date >= syncFromStr && e.date <= syncToStr && e.symbol)
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

  // --- Economic events, IPO, stock splits from FMP ---
  if (process.env.FMP_API_KEY) {
    for (const kind of ["economic", "ipo", "splits"] as const) {
      try {
        const s = await syncFmpCalendarEventTypes(syncFrom, syncTo, [kind]);
        stats[kind] = s[kind];
      } catch (e) {
        stats.errors.push(`${kind}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // --- Cleanup stale events (older than 7 days) ---
  const staleDate = toISODate(addDays(dayStart, -SYNC_PAST_DAYS));
  stats.deleted = await deleteStaleEvents(staleDate);

  return {
    ok: true,
    synced: { earnings: stats.earnings, economic: stats.economic, ipo: stats.ipo, splits: stats.splits },
    deleted: stats.deleted,
    errors: stats.errors.length > 0 ? stats.errors : undefined,
  };
});

/**
 * Cron: sync event calendar data from Alpha Vantage (earnings) and FMP (economic, IPO, splits).
 * Runs daily at 6 AM UTC. Stores ~90 days ahead and 7 days back (aligned with stale cleanup).
 * Requires FMP_API_KEY for economic, IPO, and stock splits.
 */
export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("event-sync", req.headers.get("authorization"));
  if (denied) return denied;
  return runEventSync();
}

async function fetchFmpEarnings(from: Date, to: Date): Promise<FmpEarningsEvent[]> {
  const { fetchEarningsCalendar } = await import("@/lib/api-providers/fmp");
  return fetchEarningsCalendar(from, to);
}
