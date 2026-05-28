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
