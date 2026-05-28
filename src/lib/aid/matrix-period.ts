import type { MatrixCell } from "@/lib/portfolio-performance-matrix";

export interface PeriodStatValue {
  pct: number | null;
  abs: number | null;
  unavailable: boolean;
}

export function matrixCellToPeriodStat(cell: MatrixCell | undefined): PeriodStatValue {
  if (!cell || cell.kind === "empty") return { pct: null, abs: null, unavailable: false };
  if (cell.kind === "pro") return { pct: null, abs: null, unavailable: true };
  if (cell.kind === "percent") return { pct: cell.value ?? null, abs: null, unavailable: false };
  if (cell.kind === "currency") return { pct: null, abs: cell.value ?? null, unavailable: false };
  return { pct: null, abs: null, unavailable: false };
}

/** Fill missing € change from % and portfolio value (end-of-period value). */
export function enrichPeriodStatAbs(
  stat: PeriodStatValue,
  portfolioValue: number,
  dayAbsFallback?: number | null,
): PeriodStatValue {
  if (stat.unavailable) return stat;
  let { pct, abs } = stat;
  if (pct != null && abs == null && dayAbsFallback != null && Number.isFinite(dayAbsFallback)) {
    abs = dayAbsFallback;
  } else if (pct != null && abs == null && portfolioValue > 0) {
    const r = pct / 100;
    abs = portfolioValue * (r / (1 + r));
  }
  return { pct, abs, unavailable: false };
}
