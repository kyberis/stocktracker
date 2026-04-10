import { upsertCalendarEventsBatch } from "@/lib/db";
import {
  fetchEconomicCalendar,
  fetchIpoCalendar,
  fetchSplitsCalendar,
} from "@/lib/api-providers/fmp";

export type FmpCalendarSyncType = "economic" | "ipo" | "splits";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const BATCH = 50;

/**
 * Upserts FMP economic, IPO, and stock-split calendar rows into `calendar_events`.
 * Used by the event-sync cron and on-demand hydration in GET /api/events.
 */
export async function syncFmpCalendarEventTypes(
  syncFrom: Date,
  syncTo: Date,
  types: FmpCalendarSyncType[]
): Promise<{ economic: number; ipo: number; splits: number }> {
  if (!process.env.FMP_API_KEY || types.length === 0) {
    return { economic: 0, ipo: 0, splits: 0 };
  }

  const syncFromStr = toISODate(syncFrom);
  const syncToStr = toISODate(syncTo);
  const stats = { economic: 0, ipo: 0, splits: 0 };

  if (types.includes("economic")) {
    const raw = await fetchEconomicCalendar(syncFrom, syncTo);
    const mapped = raw
      .filter((e) => {
        const d = (e.date || "").slice(0, 10);
        return d >= syncFromStr && d <= syncToStr && d.length === 10;
      })
      .map((e) => {
        const eventLabel =
          e.event?.trim() ||
          (e as { eventName?: string }).eventName?.trim() ||
          (e as { name?: string }).name?.trim() ||
          "Economic indicator";
        const dateStr = e.date.slice(0, 10);
        return {
          id: `economic:${slugify(eventLabel)}:${dateStr}`,
          event_type: "economic" as const,
          symbol: null as string | null,
          name: eventLabel,
          event_date: dateStr,
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
        };
      });

    for (let i = 0; i < mapped.length; i += BATCH) {
      await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
    }
    stats.economic = mapped.length;
  }

  if (types.includes("ipo")) {
    const raw = await fetchIpoCalendar(syncFrom, syncTo);
    const mapped = raw
      .filter((e) => e.date >= syncFromStr && e.date <= syncToStr)
      .map((e) => {
        const company =
          e.company?.trim() ||
          (e as { name?: string }).name?.trim() ||
          e.symbol?.trim() ||
          "IPO";
        return {
          id: `ipo:${e.symbol || slugify(company)}:${e.date}`,
          event_type: "ipo" as const,
          symbol: e.symbol || null,
          name: company,
          event_date: e.date,
          event_time: null as string | null,
          details: JSON.stringify({
            exchange: e.exchange,
            priceRange: e.priceRange,
            shares: e.shares,
            marketCap: e.marketCap,
            actions: e.actions,
          }),
        };
      });

    for (let i = 0; i < mapped.length; i += BATCH) {
      await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
    }
    stats.ipo = mapped.length;
  }

  if (types.includes("splits")) {
    const raw = await fetchSplitsCalendar(syncFrom, syncTo);
    const mapped = raw
      .filter((e) => e.date >= syncFromStr && e.date <= syncToStr && e.symbol)
      .map((e) => {
        const isReverse = e.numerator < e.denominator;
        const ratio = `${e.numerator}:${e.denominator}`;
        return {
          id: `splits:${e.symbol}:${e.date}`,
          event_type: "splits" as const,
          symbol: e.symbol,
          name: e.symbol,
          event_date: e.date,
          event_time: null as string | null,
          details: JSON.stringify({
            numerator: e.numerator,
            denominator: e.denominator,
            ratio,
            isReverse,
            splitType: e.splitType || (isReverse ? "Reverse" : "Forward"),
          }),
        };
      });

    for (let i = 0; i < mapped.length; i += BATCH) {
      await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
    }
    stats.splits = mapped.length;
  }

  return stats;
}
