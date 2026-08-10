const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const R6_MAX_AGE_DAYS = 365;
/** Tolerate small clock skew / same-day filings labelled tomorrow. */
export const R6_FUTURE_SLACK_DAYS = 2;

export type GuidanceAsOfFreshness = "ok" | "stale" | "future" | "unparseable";

/**
 * Parse `YYYY-MM-DD` / `YYYY-MM` / ISO timestamps into a Date at UTC midnight.
 * Returns null when the string is not a usable date.
 */
export function parseGuidanceAsOf(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Prefer explicit calendar forms so "2026-07" means July 1, not local parse quirks.
  const ym = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, 1));
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return null;
  const dt = new Date(t);
  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
  );
}

function utcToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Classify a guidance.asOf string the same way deterministic R6 does. */
export function classifyGuidanceAsOf(
  asOfRaw: string | null | undefined,
  now: Date = new Date(),
): GuidanceAsOfFreshness {
  const asOf = parseGuidanceAsOf(asOfRaw);
  if (!asOf) return "unparseable";
  const today = utcToday(now);
  const ageDays = (today.getTime() - asOf.getTime()) / MS_PER_DAY;
  if (ageDays > R6_MAX_AGE_DAYS) return "stale";
  if (ageDays < -R6_FUTURE_SLACK_DAYS) return "future";
  return "ok";
}
