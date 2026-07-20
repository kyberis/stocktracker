import type { ProviderHistoricalPoint } from "@/lib/api-providers/types";

export interface TechnicalLevels {
  /** Max closing price in the provided series (e.g. ~12 months). */
  closeHigh: number | null;
  closeHighDate: string | null;
  /** Percent distance from current price to closeHigh (negative = below). */
  distanceToCloseHighPct: number | null;
  support: number | null;
  resistance: number | null;
  avgVolume: number | null;
  latestVolume: number | null;
  ma50: number | null;
  ma200: number | null;
}

function sma(closes: number[], window: number): number | null {
  if (closes.length < window) return null;
  const slice = closes.slice(closes.length - window);
  return slice.reduce((a, b) => a + b, 0) / window;
}

/**
 * Derive technical levels from a real historical series.
 * Never invents values — returns null when the series is insufficient.
 */
export function computeTechnicalLevels(
  history: ProviderHistoricalPoint[],
  currentPrice: number | null,
): TechnicalLevels {
  const empty: TechnicalLevels = {
    closeHigh: null,
    closeHighDate: null,
    distanceToCloseHighPct: null,
    support: null,
    resistance: null,
    avgVolume: null,
    latestVolume: null,
    ma50: null,
    ma200: null,
  };
  if (!history.length) return empty;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((p) => p.close).filter((c) => Number.isFinite(c));
  if (!closes.length) return empty;

  let closeHigh = closes[0];
  let closeHighDate = sorted[0].date;
  for (const p of sorted) {
    if (p.close > closeHigh) {
      closeHigh = p.close;
      closeHighDate = p.date;
    }
  }

  const lows = sorted.map((p) => p.low).filter((n) => Number.isFinite(n));
  const highs = sorted.map((p) => p.high).filter((n) => Number.isFinite(n));
  const recent = sorted.slice(-60);
  const recentLows = recent.map((p) => p.low).filter((n) => Number.isFinite(n));
  const recentHighs = recent.map((p) => p.high).filter((n) => Number.isFinite(n));

  const support =
    recentLows.length > 0
      ? Math.min(...recentLows)
      : lows.length > 0
        ? Math.min(...lows)
        : null;
  const resistance =
    recentHighs.length > 0
      ? Math.max(...recentHighs)
      : highs.length > 0
        ? Math.max(...highs)
        : null;

  const volumes = sorted.map((p) => p.volume).filter((v) => Number.isFinite(v) && v > 0);
  const avgVolume =
    volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;
  const latestVolume = volumes.length > 0 ? volumes[volumes.length - 1]! : null;

  let distanceToCloseHighPct: number | null = null;
  if (currentPrice != null && Number.isFinite(currentPrice) && closeHigh > 0) {
    distanceToCloseHighPct = ((currentPrice - closeHigh) / closeHigh) * 100;
  }

  return {
    closeHigh,
    closeHighDate,
    distanceToCloseHighPct,
    support,
    resistance,
    avgVolume,
    latestVolume,
    ma50: sma(closes, 50),
    ma200: sma(closes, 200),
  };
}

export function yoyChange(
  current: number | null | undefined,
  prior: number | null | undefined,
): number | null {
  if (current == null || prior == null || !Number.isFinite(current) || !Number.isFinite(prior)) {
    return null;
  }
  if (prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}
