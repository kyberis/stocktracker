import { getActiveMarketsAt } from "@/lib/market-hours";
import type { AidStatusPayload } from "@/lib/types";

export type AidMarketSession = AidStatusPayload["marketSession"];

function localTimeInZone(tz: string, now: Date): { hours: number; minutes: number; dayOfWeek: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  let hours = 0;
  let minutes = 0;
  let weekday = "Mon";
  for (const p of parts) {
    if (p.type === "hour") hours = Number(p.value);
    if (p.type === "minute") minutes = Number(p.value);
    if (p.type === "weekday") weekday = p.value;
  }
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hours, minutes, dayOfWeek: dayMap[weekday] ?? now.getDay() };
}

function resolveUsExtendedSession(now: Date): AidMarketSession {
  const { hours, minutes, dayOfWeek } = localTimeInZone("America/New_York", now);
  if (dayOfWeek === 0 || dayOfWeek === 6) return "closed";

  const mins = hours * 60 + minutes;
  const preStart = 4 * 60;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const afterEnd = 20 * 60;

  if (mins >= open && mins < close) return "open";
  if (mins >= preStart && mins < open) return "pre";
  if (mins >= close && mins < afterEnd) return "after";
  return "closed";
}

/** Portfolio-aware session for Investor Briefing (EU/US hours via holdings). */
export function resolveAidMarketSession(
  holdings: ReadonlyArray<{ assetType?: string; exchange?: string }>,
  now = new Date(),
): AidMarketSession {
  if (holdings.some((h) => h.assetType === "crypto")) return "open";

  const markets = getActiveMarketsAt(holdings, now);
  if (markets.some((m) => m.isOpen)) return "open";

  return resolveUsExtendedSession(now);
}
