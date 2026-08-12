import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import {
  calculatePeriodReturn,
  calculatePortfolioValueOnDate,
  calculateWindowedModifiedDietzReturn,
  type HoldingSeriesEntry,
} from "@/lib/performance";
import { sanitizeTtwror } from "@/lib/portfolio/sanity";
import type { ExchangeRates, Holding, Transaction } from "@/lib/types";

/** Snapshot row from GET /api/portfolio/history */
export interface SnapshotHistoryPoint {
  date: string;
  value: number;
  invested: number;
  stockValue: number;
  etfValue: number;
  fundValue: number;
  cryptoValue: number;
}

export type MatrixPeriodKey =
  | "today"
  | "oneWeek"
  | "oneMonth"
  | "ytd"
  | "oneYear"
  | "threeYear"
  | "fiveYear"
  | "tenYear"
  | "all";

export const MATRIX_PERIOD_KEYS: MatrixPeriodKey[] = [
  "today",
  "oneWeek",
  "oneMonth",
  "ytd",
  "oneYear",
  "threeYear",
  "fiveYear",
  "tenYear",
  "all",
];

/** @deprecated Long horizons are no longer plan-gated (subscription model v2). Kept for callers/tests. */
export const PRO_MATRIX_PERIOD_KEYS: MatrixPeriodKey[] = [
  "threeYear",
  "fiveYear",
  "tenYear",
  "all",
];

export type MatrixCellKind = "percent" | "currency" | "empty" | "pro";

export interface MatrixCell {
  kind: MatrixCellKind;
  /** Percent return or absolute currency delta when kind is percent/currency */
  value?: number;
}

export interface MatrixRow {
  assetKey: AssetFilter;
  currentValue: number;
  cells: Record<MatrixPeriodKey, MatrixCell>;
}

export interface PeriodAnchorDates {
  oneWeek: string;
  oneMonth: string;
  ytd: string;
  oneYear: string;
  threeYear: string;
  fiveYear: string;
  tenYear: string;
}

export function getMatrixPeriodAnchorDates(now: Date = new Date()): PeriodAnchorDates {
  const ytd = `${now.getFullYear()}-01-01`;

  const ow = new Date(now);
  ow.setDate(ow.getDate() - 7);
  const oneWeek = ow.toISOString().split("T")[0];

  const om = new Date(now);
  om.setMonth(om.getMonth() - 1);
  const oneMonth = om.toISOString().split("T")[0];

  const oy = new Date(now);
  oy.setFullYear(oy.getFullYear() - 1);
  const oneYear = oy.toISOString().split("T")[0];

  const y3 = new Date(now);
  y3.setFullYear(y3.getFullYear() - 3);
  const threeYear = y3.toISOString().split("T")[0];

  const y5 = new Date(now);
  y5.setFullYear(y5.getFullYear() - 5);
  const fiveYear = y5.toISOString().split("T")[0];

  const y10 = new Date(now);
  y10.setFullYear(y10.getFullYear() - 10);
  const tenYear = y10.toISOString().split("T")[0];

  return { oneWeek, oneMonth, ytd, oneYear, threeYear, fiveYear, tenYear };
}

/** @deprecated Use getMatrixPeriodAnchorDates — kept for AggregatedPortfolioPeriodMetrics compat */
export function getAggregatedPeriodAnchorDates(): {
  oneWeek: string;
  threeMonth: string;
  sixMonth: string;
  ytd: string;
  oneYear: string;
} {
  const d = getMatrixPeriodAnchorDates();
  const now = new Date();
  const m3 = new Date(now);
  m3.setMonth(m3.getMonth() - 3);
  const m6 = new Date(now);
  m6.setMonth(m6.getMonth() - 6);
  return {
    oneWeek: d.oneWeek,
    threeMonth: m3.toISOString().split("T")[0],
    sixMonth: m6.toISOString().split("T")[0],
    ytd: d.ytd,
    oneYear: d.oneYear,
  };
}

export function valueFromSnapshot(point: SnapshotHistoryPoint, assetKey: AssetFilter): number {
  const stock = point.stockValue ?? 0;
  const etf = point.etfValue ?? 0;
  const fund = point.fundValue ?? 0;
  const crypto = point.cryptoValue ?? 0;
  const perTypeSum = stock + etf + fund + crypto;

  if (assetKey === "stock") return stock;
  if (assetKey === "etf") return etf;
  if (assetKey === "fund") return fund;
  if (assetKey === "crypto") return crypto;
  // Fixed-return is not persisted in snapshot buckets yet (client overlay only).
  if (assetKey === "fixed_return") return 0;
  return perTypeSum > 0 ? perTypeSum : point.value;
}

export function snapshotValueOnOrBefore(
  points: SnapshotHistoryPoint[],
  anchorDate: string,
  assetKey: AssetFilter,
): number | null {
  if (points.length === 0) return null;
  const anchor = anchorDate.slice(0, 10);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let result: number | null = null;
  for (const p of sorted) {
    const d = p.date.slice(0, 10);
    if (d <= anchor) {
      result = valueFromSnapshot(p, assetKey);
    } else {
      break;
    }
  }
  return result;
}

const SNAPSHOT_SLEEVES: AssetFilter[] = ["stock", "etf", "fund", "crypto"];

/**
 * Resolve a usable past value for a matrix period.
 * Guardrails when the direct sleeve bucket is missing/zero:
 * - fixed_return is not in snapshots → treat face value as flat (past = current)
 * - if one active sleeve lacks a bucket but All + siblings do, use residual
 *   allPast − Σ otherPast so Acciones 1S cannot go blank while Todos has a number
 */
export function resolvePeriodPastValue(args: {
  snapshots: SnapshotHistoryPoint[];
  anchorDate: string;
  assetKey: AssetFilter;
  current: number;
  currentByAsset: Partial<Record<AssetFilter, number>>;
}): number | null {
  const { snapshots, anchorDate, assetKey, current, currentByAsset } = args;

  if (assetKey === "fixed_return") {
    return current > 0 ? current : null;
  }

  const direct = snapshotValueOnOrBefore(snapshots, anchorDate, assetKey);
  if (direct != null && direct > 0) return direct;

  if (assetKey === "all" || !SNAPSHOT_SLEEVES.includes(assetKey)) return direct;

  const allPast = snapshotValueOnOrBefore(snapshots, anchorDate, "all");
  if (allPast == null || allPast <= 0) return direct;

  let others = 0;
  for (const k of SNAPSHOT_SLEEVES) {
    if (k === assetKey) continue;
    if ((currentByAsset[k] ?? 0) <= 0) continue;
    const v = snapshotValueOnOrBefore(snapshots, anchorDate, k);
    if (v == null || v <= 0) return direct;
    others += v;
  }

  const residual = allPast - others;
  return residual > 0 ? residual : direct;
}

export function firstSnapshotAnchorDate(points: SnapshotHistoryPoint[]): string | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[0].date.slice(0, 10);
}

/**
 * Force the All Assets "today" cell to the value-weighted combination of class rows.
 * Guards against upstream drift where All Assets can show a small green gain while
 * stocks (the dominant sleeve) are sharply red.
 */
export function reconcileAllAssetsToday(rows: MatrixRow[]): MatrixRow[] {
  const allIdx = rows.findIndex((r) => r.assetKey === "all");
  if (allIdx < 0) return rows;

  let dayPL = 0;
  let prior = 0;
  let any = false;

  for (const row of rows) {
    if (row.assetKey === "all") continue;
    const cell = row.cells.today;
    if (!cell || (cell.kind !== "percent" && cell.kind !== "currency")) continue;
    if (cell.value == null || !Number.isFinite(cell.value)) continue;
    if (row.currentValue <= 0) continue;

    if (cell.kind === "currency") {
      dayPL += cell.value;
      prior += Math.max(0, row.currentValue - cell.value);
      any = true;
      continue;
    }

    const r = cell.value / 100;
    if (1 + r <= 0) continue;
    const sleevePrior = row.currentValue / (1 + r);
    dayPL += row.currentValue - sleevePrior;
    prior += sleevePrior;
    any = true;
  }

  if (!any || prior <= 0) return rows;

  const reconciledPct = (dayPL / prior) * 100;
  const allRow = rows[allIdx]!;
  const todayKind = allRow.cells.today?.kind === "currency" ? "currency" : "percent";
  const nextToday: MatrixCell =
    todayKind === "currency"
      ? { kind: "currency", value: dayPL }
      : { kind: "percent", value: reconciledPct };

  const next = rows.slice();
  next[allIdx] = {
    ...allRow,
    cells: { ...allRow.cells, today: nextToday },
  };
  return next;
}

export interface PeriodReturnFlowsContext {
  transactions: Transaction[];
  periodStart: string;
  periodEnd: string;
  exchangeRates: ExchangeRates;
  baseCurrency: string;
}

/**
 * Windowed-return cell for one period (TRF-028).
 *
 * Prefer flow-adjusted Modified Dietz when it is finite and passes
 * sanitizeTtwror against the naive (current − past) / past reference.
 *
 * Guardrail: if Dietz is unavailable (near-zero weighted denominator) or
 * rejected by the sanity gate, fall back to the simple period return whenever
 * a positive past value exists. Showing "—" on Acciones 1S while Todos /
 * Cripto have numbers is worse than a non-flow-adjusted figure — empty cells
 * are reserved for truly missing history (no past anchor).
 */
function periodReturnCell(
  current: number,
  past: number | null,
  flows: PeriodReturnFlowsContext,
): MatrixCell {
  // Universal-access model: long periods are not plan-gated (v2 quotas).
  if (past == null || past <= 0) return { kind: "empty" };

  const simple = calculatePeriodReturn(current, past);
  const dietz = calculateWindowedModifiedDietzReturn(
    past,
    current,
    flows.transactions,
    flows.periodStart,
    flows.periodEnd,
    flows.exchangeRates,
    flows.baseCurrency,
  );
  const preferred = sanitizeTtwror(dietz, simple);
  const pct =
    preferred ?? (simple != null && Number.isFinite(simple) ? simple : null);
  if (pct == null) return { kind: "empty" };
  return { kind: "percent", value: pct };
}

function todayCell(
  dayPct: number | undefined,
  dayAbs: number | undefined,
  displayMode: "percent" | "currency",
): MatrixCell {
  if (dayPct == null && dayAbs == null) return { kind: "empty" };
  if (displayMode === "currency") {
    if (dayAbs == null) return { kind: "empty" };
    return { kind: "currency", value: dayAbs };
  }
  if (dayPct == null) return { kind: "empty" };
  return { kind: "percent", value: dayPct };
}

/** Ticker → assetType lookup so a sell transaction (no assetType of its own
 * in older rows) can still be attributed to the right bucket. */
function filterTransactionsByAsset(
  transactions: Transaction[],
  assetKey: AssetFilter,
): Transaction[] {
  if (assetKey === "all") return transactions;
  return transactions.filter((t) => (t.assetType ?? "stock") === assetKey);
}

export interface BuildMatrixFromSnapshotsInput {
  snapshots: SnapshotHistoryPoint[];
  currentByAsset: Partial<Record<AssetFilter, number>>;
  dayPctByAsset: Partial<Record<AssetFilter, number>>;
  dayAbsByAsset: Partial<Record<AssetFilter, number>>;
  isPro: boolean;
  displayMode: "percent" | "currency";
  /** Which asset rows to include (non-zero current or history) */
  assetKeys: AssetFilter[];
  /** Flow-adjusted return inputs (TRF-028). */
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  baseCurrency: string;
  now?: Date;
}

export function buildMatrixFromSnapshots(input: BuildMatrixFromSnapshotsInput): MatrixRow[] {
  const {
    snapshots,
    currentByAsset,
    dayPctByAsset,
    dayAbsByAsset,
    displayMode,
    assetKeys,
    transactions,
    exchangeRates,
    baseCurrency,
    now = new Date(),
  } = input;

  const anchors = getMatrixPeriodAnchorDates(now);
  const allAnchor = firstSnapshotAnchorDate(snapshots);
  const periodEnd = now.toISOString().slice(0, 10);

  return assetKeys.map((assetKey) => {
    const current = currentByAsset[assetKey] ?? 0;
    const assetTransactions = filterTransactionsByAsset(transactions, assetKey);

    const anchorMap: Record<Exclude<MatrixPeriodKey, "today">, string> = {
      oneWeek: anchors.oneWeek,
      oneMonth: anchors.oneMonth,
      ytd: anchors.ytd,
      oneYear: anchors.oneYear,
      threeYear: anchors.threeYear,
      fiveYear: anchors.fiveYear,
      tenYear: anchors.tenYear,
      all: allAnchor ?? anchors.tenYear,
    };

    const cells = {} as Record<MatrixPeriodKey, MatrixCell>;
    cells.today = todayCell(dayPctByAsset[assetKey], dayAbsByAsset[assetKey], displayMode);

    for (const key of MATRIX_PERIOD_KEYS) {
      if (key === "today") continue;
      const anchor = anchorMap[key];
      const past = resolvePeriodPastValue({
        snapshots,
        anchorDate: anchor,
        assetKey,
        current,
        currentByAsset,
      });
      let cell = periodReturnCell(current, past, {
        transactions: assetTransactions,
        periodStart: anchor,
        periodEnd,
        exchangeRates,
        baseCurrency,
      });
      if (cell.kind === "percent" && displayMode === "currency" && cell.value != null && past != null) {
        cell = { kind: "currency", value: current - past };
      }
      cells[key] = cell;
    }

    return { assetKey, currentValue: current, cells };
  });
}

export interface BuildMatrixFromHistoricalInput {
  holdings: Holding[];
  entries: HoldingSeriesEntry[];
  exchangeRates: ExchangeRates;
  baseCurrency: string;
  currentByAsset: Partial<Record<AssetFilter, number>>;
  dayPctByAsset: Partial<Record<AssetFilter, number>>;
  dayAbsByAsset: Partial<Record<AssetFilter, number>>;
  isPro: boolean;
  displayMode: "percent" | "currency";
  assetKeys: AssetFilter[];
  /** Flow-adjusted return inputs (TRF-028). */
  transactions: Transaction[];
  now?: Date;
}

export function filterHoldingsByAsset(holdings: Holding[], assetKey: AssetFilter): Holding[] {
  if (assetKey === "all") return holdings;
  return holdings.filter((h) => (h.assetType ?? "stock") === assetKey);
}

export function filterEntriesByAsset(
  entries: HoldingSeriesEntry[],
  assetKey: AssetFilter,
): HoldingSeriesEntry[] {
  if (assetKey === "all") return entries;
  return entries.filter((e) => (e.holding.assetType ?? "stock") === assetKey);
}

export function buildMatrixFromHistorical(input: BuildMatrixFromHistoricalInput): MatrixRow[] {
  const {
    holdings,
    entries,
    exchangeRates,
    baseCurrency,
    currentByAsset,
    dayPctByAsset,
    dayAbsByAsset,
    displayMode,
    assetKeys,
    transactions,
    now = new Date(),
  } = input;

  const anchors = getMatrixPeriodAnchorDates(now);
  const periodEnd = now.toISOString().slice(0, 10);

  return assetKeys.map((assetKey) => {
    const filteredHoldings = filterHoldingsByAsset(holdings, assetKey);
    const filteredEntries = filterEntriesByAsset(entries, assetKey);
    const assetTransactions = filterTransactionsByAsset(transactions, assetKey);
    const current = currentByAsset[assetKey] ?? 0;

    const anchorMap: Record<Exclude<MatrixPeriodKey, "today">, string> = {
      oneWeek: anchors.oneWeek,
      oneMonth: anchors.oneMonth,
      ytd: anchors.ytd,
      oneYear: anchors.oneYear,
      threeYear: anchors.threeYear,
      fiveYear: anchors.fiveYear,
      tenYear: anchors.tenYear,
      all: anchors.tenYear,
    };

    const cells = {} as Record<MatrixPeriodKey, MatrixCell>;
    cells.today = todayCell(dayPctByAsset[assetKey], dayAbsByAsset[assetKey], displayMode);

    for (const key of MATRIX_PERIOD_KEYS) {
      if (key === "today") continue;
      if (filteredHoldings.length === 0 && assetKey !== "fixed_return") {
        cells[key] = { kind: "empty" };
        continue;
      }
      let past =
        assetKey === "fixed_return"
          ? current > 0
            ? current
            : null
          : filteredHoldings.length === 0
            ? null
            : calculatePortfolioValueOnDate(
                filteredEntries,
                anchorMap[key],
                exchangeRates,
                baseCurrency,
              );
      if ((past == null || past <= 0) && assetKey === "fixed_return" && current > 0) {
        past = current;
      }
      let cell = periodReturnCell(current, past, {
        transactions: assetTransactions,
        periodStart: anchorMap[key],
        periodEnd,
        exchangeRates,
        baseCurrency,
      });
      if (cell.kind === "percent" && displayMode === "currency" && cell.value != null) {
        cell = { kind: "currency", value: current - (past ?? 0) };
      }
      cells[key] = cell;
    }

    return { assetKey, currentValue: current, cells };
  });
}

/** Rows to show: all pill only when multiple types have value */
export function resolveMatrixAssetKeys(
  currentByAsset: Partial<Record<AssetFilter, number>>,
): AssetFilter[] {
  const types: AssetFilter[] = ["stock", "etf", "fund", "crypto", "fixed_return"];
  const activeTypes = types.filter((k) => (currentByAsset[k] ?? 0) > 0);
  const showAll = activeTypes.length > 1;
  const keys: AssetFilter[] = showAll ? ["all", ...activeTypes] : activeTypes.length > 0 ? activeTypes : ["all"];
  return keys;
}
