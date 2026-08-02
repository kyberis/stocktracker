/**
 * Linear fixed-return investment valuation.
 *
 * Example: principal 1500, +25% over 24 months → maturity value 1875.
 * Value grows linearly from principal to maturityValue between start and maturity.
 */

export interface FixedReturnParams {
  /** Principal in native currency */
  principal: number;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** Term length in whole months (> 0) */
  termMonths: number;
  /** Total return over the full term, as percent (e.g. 25 = +25%) */
  totalReturnPct: number;
}

function parseISODateUTC(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Add calendar months in UTC, clamping day-of-month when needed. */
export function addMonthsUTC(isoDate: string, months: number): string | null {
  const start = parseISODateUTC(isoDate);
  if (!start || !Number.isFinite(months)) return null;
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  const day = start.getUTCDate();
  const target = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
}

export function maturityDateFor(params: Pick<FixedReturnParams, "startDate" | "termMonths">): string | null {
  if (params.termMonths <= 0) return null;
  return addMonthsUTC(params.startDate, params.termMonths);
}

export function maturityValue(params: Pick<FixedReturnParams, "principal" | "totalReturnPct">): number {
  return params.principal * (1 + params.totalReturnPct / 100);
}

/** Display-only annualized rate: (totalReturnPct / termMonths) * 12 */
export function annualizedReturnPct(params: Pick<FixedReturnParams, "termMonths" | "totalReturnPct">): number {
  if (params.termMonths <= 0) return 0;
  return (params.totalReturnPct / params.termMonths) * 12;
}

/**
 * Linear accrued value in native currency as of `asOf` (YYYY-MM-DD).
 * Before start → 0; on/after maturity → maturity value.
 */
export function valueFixedReturnAt(params: FixedReturnParams, asOf: string): number {
  const { principal, startDate, termMonths, totalReturnPct } = params;
  if (!(principal >= 0) || termMonths <= 0) return 0;

  const start = parseISODateUTC(startDate);
  const asOfDate = parseISODateUTC(asOf);
  const maturityIso = maturityDateFor({ startDate, termMonths });
  const maturity = maturityIso ? parseISODateUTC(maturityIso) : null;
  if (!start || !asOfDate || !maturity) return 0;

  if (asOfDate.getTime() < start.getTime()) return 0;

  const target = maturityValue({ principal, totalReturnPct });
  if (asOfDate.getTime() >= maturity.getTime()) return target;

  const totalMs = maturity.getTime() - start.getTime();
  if (totalMs <= 0) return target;

  const elapsedMs = asOfDate.getTime() - start.getTime();
  const progress = Math.min(1, Math.max(0, elapsedMs / totalMs));
  return principal + (target - principal) * progress;
}

/** Day P/L in native currency: value(asOf) − value(previous calendar day). */
export function dayChangeFixedReturn(params: FixedReturnParams, asOf: string): number {
  const asOfDate = parseISODateUTC(asOf);
  if (!asOfDate) return 0;
  const prev = new Date(asOfDate);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevIso = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
  return valueFixedReturnAt(params, asOf) - valueFixedReturnAt(params, prevIso);
}

export function isFixedReturnMatured(params: FixedReturnParams, asOf: string): boolean {
  const maturityIso = maturityDateFor(params);
  const maturity = maturityIso ? parseISODateUTC(maturityIso) : null;
  const asOfDate = parseISODateUTC(asOf);
  if (!maturity || !asOfDate) return false;
  return asOfDate.getTime() >= maturity.getTime();
}

/** Progress 0..1 between start and maturity as of `asOf`. */
export function fixedReturnProgress(params: FixedReturnParams, asOf: string): number {
  const start = parseISODateUTC(params.startDate);
  const asOfDate = parseISODateUTC(asOf);
  const maturityIso = maturityDateFor(params);
  const maturity = maturityIso ? parseISODateUTC(maturityIso) : null;
  if (!start || !asOfDate || !maturity) return 0;
  if (asOfDate.getTime() <= start.getTime()) return 0;
  if (asOfDate.getTime() >= maturity.getTime()) return 1;
  const totalMs = maturity.getTime() - start.getTime();
  if (totalMs <= 0) return 1;
  return (asOfDate.getTime() - start.getTime()) / totalMs;
}
