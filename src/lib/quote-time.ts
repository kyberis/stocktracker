/**
 * Parse provider quote timestamps into epoch milliseconds.
 * Accepts Date, unix seconds/ms, numeric strings, ISO datetimes, and YYYY-MM-DD.
 */
export function parseQuoteTimestamp(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^\d{10,13}$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return n < 1e12 ? n * 1000 : n;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const ms = Date.parse(`${trimmed}T12:00:00Z`);
      return Number.isNaN(ms) ? undefined : ms;
    }
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? undefined : ms;
  }

  return undefined;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type QuoteTimeFields = {
  regularMarketTime?: number;
  fetchedAt?: number;
};

/**
 * Prefer the latest last-trade time across quotes so weekend / Monday
 * daily G/L is labeled with Friday's close, not the fetch clock.
 * Falls back to lastUpdated, then max fetchedAt.
 */
export function resolveDayMoveAsOf(
  quotes: Record<string, QuoteTimeFields>,
  lastUpdated: Date | null,
): Date | null {
  let maxMarket = 0;
  let maxFetched = 0;
  for (const q of Object.values(quotes)) {
    if (typeof q.regularMarketTime === "number" && q.regularMarketTime > maxMarket) {
      maxMarket = q.regularMarketTime;
    }
    if (typeof q.fetchedAt === "number" && q.fetchedAt > maxFetched) {
      maxFetched = q.fetchedAt;
    }
  }
  if (maxMarket > 0) return new Date(maxMarket);
  if (lastUpdated) return lastUpdated;
  if (maxFetched > 0) return new Date(maxFetched);
  return null;
}

export function formatDayMoveAsOf(
  date: Date,
  locale: string,
  todayLabel: string,
  now = new Date(),
): string {
  const time = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isSameLocalDay(date, now)) {
    return `${todayLabel} · ${time}`;
  }
  const day = date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day} · ${time}`;
}
