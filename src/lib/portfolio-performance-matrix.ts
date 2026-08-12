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

/** Long horizons gated for non-Pro (aligned with chart range selector). */
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

export function firstSnapshotAnchorDate(points: SnapshotHistoryPoint[]): string | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[0].date.slice(0, 10);
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
 * `past` (the value at the period's start anchor) is still required and
 * still comes from a real point-in-time source (a stored snapshot or a
 * current-holdings reconstruction) — that part isn't broken. What's
 * flow-adjusted is the return *between* past and current: a sale within the
 * window is attributed as an outflow from this asset-class bucket via
 * calculateWindowedModifiedDietzReturn, instead of the naive (current -
 * past) / past reading it as a loss.
 *
 * The naive calculatePeriodReturn value is kept only as the reference the
 * Dietz result gets sanity-checked against (sanitizeTtwror) — never shown
 * directly once flows are available. Degrades to "—" when Dietz can't be
 * computed (no past value, or a near-zero weighted denominator) rather than
 * falling back to the un-adjusted number.
 */
function periodReturnCell(
  current: number,
  past: number | null,
  isPro: boolean,
  periodKey: MatrixPeriodKey,
  flows: PeriodReturnFlowsContext,
): MatrixCell {
  if (!isPro && PRO_MATRIX_PERIOD_KEYS.includes(periodKey)) {
    return { kind: "pro" };
  }
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
  const pct = sanitizeTtwror(dietz, simple);
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
    isPro,
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
      const past = snapshotValueOnOrBefore(snapshots, anchor, assetKey);
      let cell = periodReturnCell(current, past, isPro, key, {
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
    isPro,
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
      if (!isPro && PRO_MATRIX_PERIOD_KEYS.includes(key)) {
        cells[key] = { kind: "pro" };
        continue;
      }
      if (filteredHoldings.length === 0) {
        cells[key] = { kind: "empty" };
        continue;
      }
      const past = calculatePortfolioValueOnDate(
        filteredEntries,
        anchorMap[key],
        exchangeRates,
        baseCurrency,
      );
      let cell = periodReturnCell(current, past, isPro, key, {
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
