import { upsertCalendarEventsBatch } from "@/lib/db";
import {
  fetchFinnhubEconomicCalendar,
  fetchFinnhubIpoCalendar,
  getFinnhubApiKey,
} from "@/lib/api-providers/finnhub";

export type FreeCalendarSyncType = "economic" | "ipo";

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
 * Upserts Finnhub economic and IPO calendar rows into `calendar_events`.
 * Replaces FMP calendar sync for the free premium stack.
 */
export async function syncFreeCalendarEventTypes(
  syncFrom: Date,
  syncTo: Date,
  types: FreeCalendarSyncType[],
): Promise<{ economic: number; ipo: number; splits: number }> {
  const apiKey = getFinnhubApiKey();
  if (!apiKey || types.length === 0) {
    return { economic: 0, ipo: 0, splits: 0 };
  }

  const syncFromStr = toISODate(syncFrom);
  const syncToStr = toISODate(syncTo);
  const stats = { economic: 0, ipo: 0, splits: 0 };

  if (types.includes("economic")) {
    const raw = await fetchFinnhubEconomicCalendar(syncFrom, syncTo, apiKey);
    const mapped = raw
      .filter((e) => {
        const d = (e.date || "").slice(0, 10);
        return d >= syncFromStr && d <= syncToStr && d.length === 10;
      })
      .map((e) => {
        const eventLabel = e.event?.trim() || "Economic indicator";
        const dateStr = e.date.slice(0, 10);
        return {
          id: `economic:${slugify(eventLabel)}:${dateStr}`,
          event_type: "economic" as const,
          symbol: null as string | null,
          name: eventLabel,
          event_date: dateStr,
          event_time: null as string | null,
          details: JSON.stringify({
            country: e.country,
            actual: e.actual,
            previous: e.previous,
            estimate: e.estimate,
            impact: e.impact,
            provider: "finnhub",
          }),
        };
      });

    for (let i = 0; i < mapped.length; i += BATCH) {
      await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
    }
    stats.economic = mapped.length;
  }

  if (types.includes("ipo")) {
    const raw = await fetchFinnhubIpoCalendar(syncFrom, syncTo, apiKey);
    const mapped = raw
      .filter((e) => {
        const d = (e.date || "").slice(0, 10);
        return d >= syncFromStr && d <= syncToStr && d.length === 10;
      })
      .map((e) => ({
        id: `ipo:${slugify(e.symbol || e.company)}:${e.date.slice(0, 10)}`,
        event_type: "ipo" as const,
        symbol: e.symbol || null,
        name: e.company || e.symbol || "IPO",
        event_date: e.date.slice(0, 10),
        event_time: null as string | null,
        details: JSON.stringify({
          exchange: e.exchange,
          priceRange: e.priceRange,
          provider: "finnhub",
        }),
      }));

    for (let i = 0; i < mapped.length; i += BATCH) {
      await upsertCalendarEventsBatch(mapped.slice(i, i + BATCH));
    }
    stats.ipo = mapped.length;
  }

  return stats;
}
