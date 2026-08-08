import type { ProviderHistoricalPoint } from "@/lib/api-providers/types";
import { computeTechnicalLevels } from "@/lib/company-analysis/technicals";
import type { TechnicalsOutput } from "@/lib/screening/schemas";

/**
 * Derive the persisted `technicals` shape from a 1y OHLC series.
 * Extends [`computeTechnicalLevels`](src/lib/company-analysis/technicals.ts) with:
 *   - 52w low + distance to low
 *   - 3m and 1y trailing return
 *   - annualised volatility (stdev of daily log returns × √252)
 *   - `aboveMa200`, `nearHigh` flags
 *
 * Returns null values liberally: missing history stays "unknown", never guessed.
 */
export function deriveScreeningTechnicals(input: {
  ticker: string;
  history: ProviderHistoricalPoint[];
  currentPrice: number | null;
  currency: string | null;
}): TechnicalsOutput {
  const { ticker, history, currentPrice, currency } = input;
  const asOf = new Date().toISOString().slice(0, 10);

  const base: TechnicalsOutput = {
    ticker: ticker.toUpperCase(),
    price: currentPrice,
    currency: currency ? currency.slice(0, 8) : null,
    closeHigh12m: null,
    closeHigh12mDate: null,
    closeLow12m: null,
    closeLow12mDate: null,
    distanceTo52wHighPct: null,
    distanceTo52wLowPct: null,
    ma50: null,
    ma200: null,
    aboveMa200: null,
    support: null,
    resistance: null,
    return3mPct: null,
    return1yPct: null,
    volatilityAnnPct: null,
    nearHigh: null,
    asOf,
    gaps: history.length === 0 ? ["no_history"] : [],
  };
  if (history.length === 0) return base;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted
    .map((p) => p.close)
    .filter((c) => Number.isFinite(c) && c > 0);
  if (closes.length === 0) return base;

  const levels = computeTechnicalLevels(sorted, currentPrice);

  let closeLow = closes[0];
  let closeLowDate = sorted[0].date;
  for (const p of sorted) {
    if (p.close < closeLow) {
      closeLow = p.close;
      closeLowDate = p.date;
    }
  }
  let distanceTo52wLowPct: number | null = null;
  if (currentPrice != null && Number.isFinite(currentPrice) && closeLow > 0) {
    distanceTo52wLowPct = ((currentPrice - closeLow) / closeLow) * 100;
  }

  const latest = closes[closes.length - 1]!;
  const firstClose = closes[0];
  const return1yPct =
    firstClose > 0 ? ((latest - firstClose) / firstClose) * 100 : null;

  const idx3m = Math.max(0, closes.length - 63);
  const close3mBase = closes[idx3m];
  const return3mPct =
    close3mBase > 0 ? ((latest - close3mBase) / close3mBase) * 100 : null;

  const dailyLogReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    const cur = closes[i]!;
    if (prev > 0 && cur > 0) {
      dailyLogReturns.push(Math.log(cur / prev));
    }
  }
  let volatilityAnnPct: number | null = null;
  if (dailyLogReturns.length >= 20) {
    const mean =
      dailyLogReturns.reduce((a, b) => a + b, 0) / dailyLogReturns.length;
    const variance =
      dailyLogReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
      (dailyLogReturns.length - 1);
    volatilityAnnPct = Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  const aboveMa200 =
    levels.ma200 != null && currentPrice != null && Number.isFinite(currentPrice)
      ? currentPrice >= levels.ma200
      : null;
  const nearHigh =
    levels.distanceToCloseHighPct != null
      ? levels.distanceToCloseHighPct >= -5
      : null;

  return {
    ...base,
    closeHigh12m: levels.closeHigh,
    closeHigh12mDate: levels.closeHighDate,
    closeLow12m: closeLow,
    closeLow12mDate: closeLowDate,
    distanceTo52wHighPct: levels.distanceToCloseHighPct,
    distanceTo52wLowPct,
    ma50: levels.ma50,
    ma200: levels.ma200,
    aboveMa200,
    support: levels.support,
    resistance: levels.resistance,
    return3mPct,
    return1yPct,
    volatilityAnnPct,
    nearHigh,
    asOf,
    gaps: [],
  };
}
