import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import {
  getMatrixPeriodAnchorDates,
  resolvePeriodPastValue,
  type MatrixPeriodKey,
  type SnapshotHistoryPoint,
} from "@/lib/portfolio-performance-matrix";
import { calculatePeriodReturn, windowedNetCashFlow, txAmountToBase } from "@/lib/performance";
import { convertCurrency } from "@/lib/utils";
import type { ExchangeRates, Holding, Transaction } from "@/lib/types";

export interface MatrixCellTxLine {
  id: string;
  date: string;
  type: string;
  ticker: string;
  assetType: string | null;
  amountBase: number;
  /** Signed Dietz flow: buy +, sell − */
  flowBase: number;
}

export interface MatrixCellBreakdown {
  assetKey: AssetFilter;
  period: MatrixPeriodKey;
  displayMode: "percent" | "currency";
  baseCurrency: string;
  periodStart: string | null;
  periodEnd: string;
  current: number;
  past: number | null;
  netCashFlow: number;
  /** Period P/L in currency (current − past − netCF); null for today or missing past */
  pl: number | null;
  /** Period % return (simple); null when unavailable */
  pct: number | null;
  /** Today-only absolute day P/L when provided */
  dayAbs: number | null;
  dayPct: number | null;
  /** Always true — matrix period cells are not vs purchase price */
  notCostBasis: true;
  costBasis: number | null;
  unrealizedVsCost: number | null;
  transactions: MatrixCellTxLine[];
  warnings: string[];
  formula: string;
}

function filterHoldingsByAsset(holdings: Holding[], assetKey: AssetFilter): Holding[] {
  if (assetKey === "all") return holdings;
  return holdings.filter((h) => (h.assetType ?? "stock") === assetKey);
}

function filterTransactionsByAsset(
  transactions: Transaction[],
  assetKey: AssetFilter,
): Transaction[] {
  if (assetKey === "all") return transactions;
  return transactions.filter((t) => (t.assetType ?? "stock") === assetKey);
}

function sleeveCostBasis(
  holdings: Holding[],
  assetKey: AssetFilter,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): number | null {
  const filtered = filterHoldingsByAsset(holdings, assetKey);
  if (filtered.length === 0) return null;
  let sum = 0;
  for (const h of filtered) {
    const local = h.shares * h.purchasePrice;
    if (!Number.isFinite(local)) continue;
    sum += convertCurrency(local, h.displayCurrency || "EUR", baseCurrency, exchangeRates);
  }
  return Number.isFinite(sum) ? sum : null;
}

function txLinesInWindow(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): MatrixCellTxLine[] {
  const start = periodStart.slice(0, 10);
  const end = periodEnd.slice(0, 10);
  const lines: MatrixCellTxLine[] = [];
  for (const tx of transactions) {
    if (tx.type !== "buy" && tx.type !== "sell") continue;
    const d = tx.date.slice(0, 10);
    if (d < start || d > end) continue;
    const amount = txAmountToBase(tx.totalAmount, tx, baseCurrency, exchangeRates);
    const fees = txAmountToBase(tx.fees || 0, tx, baseCurrency, exchangeRates);
    const taxes = txAmountToBase(tx.taxes || 0, tx, baseCurrency, exchangeRates);
    const flow = tx.type === "buy" ? amount + fees + taxes : -(amount - fees - taxes);
    lines.push({
      id: tx.id,
      date: d,
      type: tx.type,
      ticker: tx.ticker,
      assetType: tx.assetType ?? null,
      amountBase: amount,
      flowBase: flow,
    });
  }
  lines.sort((a, b) => a.date.localeCompare(b.date));
  return lines;
}

export interface BuildMatrixCellBreakdownInput {
  assetKey: AssetFilter;
  period: MatrixPeriodKey;
  displayMode: "percent" | "currency";
  baseCurrency: string;
  current: number;
  holdings: Holding[];
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  snapshots: SnapshotHistoryPoint[];
  currentByAsset: Partial<Record<AssetFilter, number>>;
  dayAbs?: number | null;
  dayPct?: number | null;
  now?: Date;
}

/**
 * Deterministic explanation payload for one matrix cell.
 * Period cells use snapshot past + flow-adjusted P/L — never purchase-price P/L.
 */
export function buildMatrixCellBreakdown(input: BuildMatrixCellBreakdownInput): MatrixCellBreakdown {
  const {
    assetKey,
    period,
    displayMode,
    baseCurrency,
    current,
    holdings,
    transactions,
    exchangeRates,
    snapshots,
    currentByAsset,
    dayAbs = null,
    dayPct = null,
    now = new Date(),
  } = input;

  const periodEnd = now.toISOString().slice(0, 10);
  const costBasis = sleeveCostBasis(holdings, assetKey, exchangeRates, baseCurrency);
  const unrealizedVsCost =
    costBasis != null && Number.isFinite(current) ? current - costBasis : null;

  const warnings: string[] = [];
  const assetTxs = filterTransactionsByAsset(transactions, assetKey);

  if (period === "today") {
    const formula =
      displayMode === "currency"
        ? "today € = day P/L from live quotes (not vs purchase price)"
        : "today % = day P/L ÷ yesterday close × 100";
    return {
      assetKey,
      period,
      displayMode,
      baseCurrency,
      periodStart: null,
      periodEnd,
      current,
      past: null,
      netCashFlow: 0,
      pl: dayAbs,
      pct: dayPct,
      dayAbs,
      dayPct,
      notCostBasis: true,
      costBasis,
      unrealizedVsCost,
      transactions: [],
      warnings,
      formula,
    };
  }

  const anchors = getMatrixPeriodAnchorDates(now);
  const periodStart = anchors[period];
  const past = resolvePeriodPastValue({
    snapshots,
    anchorDate: periodStart,
    assetKey,
    current,
    currentByAsset,
  });

  const sleeveLines = txLinesInWindow(assetTxs, periodStart, periodEnd, exchangeRates, baseCurrency);
  const untypedInWindow = transactions.filter((t) => {
    if (t.type !== "buy" && t.type !== "sell") return false;
    const d = t.date.slice(0, 10);
    if (d < periodStart || d > periodEnd) return false;
    return t.assetType == null;
  });
  if (untypedInWindow.length > 0 && assetKey !== "all") {
    warnings.push(
      `${untypedInWindow.length} transaction(s) in this window have no assetType (default to stock) and may be mis-attributed.`,
    );
  }

  const netCashFlow =
    past == null || past <= 0
      ? 0
      : windowedNetCashFlow(assetTxs, periodStart, periodEnd, exchangeRates, baseCurrency);

  const pl = past != null && past > 0 ? current - past - netCashFlow : null;
  const pct = past != null && past > 0 ? calculatePeriodReturn(current, past) : null;

  if (past != null && past > 0 && Math.abs(past) > current * 2 && (pl ?? 0) < -current) {
    warnings.push(
      "Period loss is larger than today's sleeve value because the snapshot value at the period start was much higher (or large net buys were subtracted).",
    );
  }

  const formula =
    displayMode === "currency"
      ? "period € = current − past − netCashFlow (buys +, sells −); not vs purchase price"
      : "period % ≈ (current − past) / past × 100 (Dietz when flows exist); not vs purchase price";

  return {
    assetKey,
    period,
    displayMode,
    baseCurrency,
    periodStart,
    periodEnd,
    current,
    past,
    netCashFlow,
    pl,
    pct,
    dayAbs: null,
    dayPct: null,
    notCostBasis: true,
    costBasis,
    unrealizedVsCost,
    transactions: sleeveLines,
    warnings,
    formula,
  };
}

/** Plain-language fallback when the LLM is unavailable. */
export function buildDeterministicMatrixCellNarrative(b: MatrixCellBreakdown): string {
  const cur = b.current.toFixed(2);
  const parts: string[] = [];

  if (b.period === "today") {
    const abs = b.dayAbs != null ? b.dayAbs.toFixed(2) : "n/a";
    const pct = b.dayPct != null ? `${b.dayPct.toFixed(2)}%` : "n/a";
    parts.push(
      `Today for this sleeve: day P/L ${abs} ${b.baseCurrency} (${pct}). Current value ${cur} ${b.baseCurrency}.`,
    );
  } else {
    const past = b.past != null ? b.past.toFixed(2) : "n/a";
    const net = b.netCashFlow.toFixed(2);
    const pl = b.pl != null ? b.pl.toFixed(2) : "n/a";
    parts.push(
      `Period ${b.period}: current ${cur} − past ${past} − netCashFlow ${net} = ${pl} ${b.baseCurrency}.`,
    );
    parts.push(`${b.transactions.length} buy/sell transaction(s) attributed to this sleeve in the window.`);
  }

  parts.push("This is period performance vs a past snapshot, not profit vs what you paid (purchase price).");
  if (b.costBasis != null && b.unrealizedVsCost != null) {
    parts.push(
      `For contrast, unrealized vs purchase cost ≈ ${b.unrealizedVsCost.toFixed(2)} ${b.baseCurrency} (cost basis ${b.costBasis.toFixed(2)}).`,
    );
  }
  if (b.warnings.length > 0) {
    parts.push(`Warnings: ${b.warnings.join(" ")}`);
  }
  parts.push("AI narrative unavailable; this summary is deterministic. Not financial advice.");
  return parts.join(" ");
}
