import { NextRequest } from "next/server";
import { upsertCalendarEventsBatch, deleteStaleEvents } from "@/lib/db";
import { getGlobalAlphaVantageApiKey, isFeatureEnabled } from "@/lib/db";
import type { FmpEarningsEvent } from "@/lib/api-providers/fmp";
import {
  fetchFinnhubEarningsCalendar,
  getFinnhubApiKey,
} from "@/lib/api-providers/finnhub";
import { syncFreeCalendarEventTypes } from "@/lib/market-data/free-calendar-sync";
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
  const dateIdx = headers.indexOf("reportDate");
  const fiscalIdx = headers.indexOf("fiscalDateEnding");
  const estIdx = headers.indexOf("estimate");

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

const SYNC_HORIZON_DAYS = 90;
const SYNC_PAST_DAYS = 7;

const runEventSync = withCronLogging("event-sync", async () => {
  const dayStart = today();
  const syncFrom = addDays(dayStart, -SYNC_PAST_DAYS);
  const syncTo = addDays(dayStart, SYNC_HORIZON_DAYS);
  const syncFromStr = toISODate(syncFrom);
  const syncToStr = toISODate(syncTo);

  const stats = { earnings: 0, economic: 0, ipo: 0, splits: 0, deleted: 0, errors: [] as string[] };

  // --- Earnings from Finnhub (free primary) ---
  const finnhubKey = getFinnhubApiKey();
  if (finnhubKey) {
    try {
      const raw = await fetchFinnhubEarningsCalendar(syncFrom, syncTo, finnhubKey);
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
          eps: e.eps,
          revenue: e.revenue,
          revenueEstimated: e.revenueEstimated,
          fiscalDateEnding: e.fiscalDateEnding,
          provider: "finnhub",
        }),
      }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
      }
      stats.earnings = mapped.length;
    } catch (e) {
      stats.errors.push(`finnhub-earnings: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Earnings from Alpha Vantage (optional supplement) ---
  const fmpEarningsOnly = await isFeatureEnabled("market_data_fmp_event_sync");
  const avAllowed = await isFeatureEnabled("market_data_alpha_vantage");
  const avKey = getGlobalAlphaVantageApiKey();
  if (avAllowed && !fmpEarningsOnly && avKey && stats.earnings === 0) {
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
          provider: "alphavantage",
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

  // --- Optional FMP earnings if key still configured ---
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
            provider: "fmp",
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

  // --- Economic + IPO from Finnhub (free primary) ---
  try {
    const s = await syncFreeCalendarEventTypes(syncFrom, syncTo, ["economic", "ipo"]);
    stats.economic = s.economic;
    stats.ipo = s.ipo;
  } catch (e) {
    stats.errors.push(`finnhub-calendar: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Optional FMP economic/IPO/splits if key still configured ---
  if (process.env.FMP_API_KEY) {
    for (const kind of ["economic", "ipo", "splits"] as const) {
      try {
        const s = await syncFmpCalendarEventTypes(syncFrom, syncTo, [kind]);
        stats[kind] = Math.max(stats[kind], s[kind]);
      } catch (e) {
        stats.errors.push(`${kind}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

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
 * Cron: sync event calendar from Finnhub (free) with optional AV/FMP supplements.
 * Runs daily at 6 AM UTC. Stores ~90 days ahead and 7 days back.
 */
export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("event-sync", req);
  if (denied) return denied;
  return runEventSync();
}

async function fetchFmpEarnings(from: Date, to: Date): Promise<FmpEarningsEvent[]> {
  const { fetchEarningsCalendar } = await import("@/lib/api-providers/fmp");
  return fetchEarningsCalendar(from, to);
}
