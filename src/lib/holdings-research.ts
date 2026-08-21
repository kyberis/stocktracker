import type { CompanyOverview, ExchangeRates, Holding, HoldingAssetType, QuoteData } from "@/lib/types";
import type { ScreenerCacheRow } from "@/lib/db/screener";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

/** Max Yahoo overview calls per holdings-research request when cache misses. */
export const OVERVIEW_FETCH_CAP = 8;

export type HoldingsResearchSortKey =
  | "name"
  | "peRatio"
  | "forwardPe"
  | "pegRatio"
  | "positionValue"
  | "weightPct"
  | "dividendYield"
  | "sectorSize"
  | "dayChange"
  | "returnPct"
  | "returnAbs"
  | "beta"
  | "pctFromHigh"
  | "analystUpside"
  | "roe"
  | "profitMargin";

export type HoldingsResearchPreset =
  | "cheapPe"
  | "highDiv"
  | "largestWeight"
  | "highBeta"
  | "nearHighs";

export const PRESET_SORT: Record<
  HoldingsResearchPreset,
  { key: HoldingsResearchSortKey; dir: "asc" | "desc" }
> = {
  cheapPe: { key: "peRatio", dir: "asc" },
  highDiv: { key: "dividendYield", dir: "desc" },
  largestWeight: { key: "weightPct", dir: "desc" },
  highBeta: { key: "beta", dir: "desc" },
  nearHighs: { key: "pctFromHigh", dir: "desc" },
};

export interface HoldingsResearchFundamentals {
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  eps: number | null;
  beta: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  analystTargetPrice: number | null;
  analystStrongBuy: number;
  analystBuy: number;
  analystHold: number;
  analystSell: number;
  analystStrongSell: number;
  sector: string;
  industry: string;
  source: "cache" | "overview" | "none";
  updatedAt: string | null;
}

export interface HoldingsResearchApiRow {
  holdingId: string;
  symbol: string;
  fundamentals: HoldingsResearchFundamentals;
}

export interface HoldingsResearchResponse {
  rows: HoldingsResearchApiRow[];
  metricsPartial: boolean;
  staleAt: string | null;
}

export function emptyFundamentals(): HoldingsResearchFundamentals {
  return {
    peRatio: null,
    forwardPe: null,
    pegRatio: null,
    dividendYield: null,
    dividendPerShare: null,
    eps: null,
    beta: null,
    profitMargin: null,
    returnOnEquity: null,
    marketCap: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    analystTargetPrice: null,
    analystStrongBuy: 0,
    analystBuy: 0,
    analystHold: 0,
    analystSell: 0,
    analystStrongSell: 0,
    sector: "",
    industry: "",
    source: "none",
    updatedAt: null,
  };
}

export function fundamentalsFromCache(row: ScreenerCacheRow): HoldingsResearchFundamentals {
  return {
    ...emptyFundamentals(),
    peRatio: row.peRatio,
    forwardPe: row.forwardPe,
    dividendYield: row.dividendYield,
    dividendPerShare: row.dividendPerShare,
    eps: row.eps,
    beta: row.beta,
    profitMargin: row.profitMargin,
    returnOnEquity: row.returnOnEquity,
    marketCap: row.marketCap,
    fiftyTwoWeekHigh: row.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: row.fiftyTwoWeekLow,
    analystStrongBuy: row.analystStrongBuy,
    analystBuy: row.analystBuy,
    analystHold: row.analystHold,
    analystSell: row.analystSell,
    analystStrongSell: row.analystStrongSell,
    sector: row.sector,
    industry: row.industry,
    source: "cache",
    updatedAt: row.updatedAt || null,
  };
}

export function fundamentalsFromOverview(ov: CompanyOverview): HoldingsResearchFundamentals {
  return {
    ...emptyFundamentals(),
    peRatio: ov.peRatio,
    forwardPe: ov.forwardPE,
    pegRatio: ov.pegRatio,
    dividendYield: ov.dividendYield,
    dividendPerShare: ov.dividendPerShare,
    eps: ov.eps,
    beta: ov.beta,
    profitMargin: ov.profitMargin,
    returnOnEquity: ov.returnOnEquity,
    analystTargetPrice: ov.analystTargetPrice,
    analystStrongBuy: ov.analystRatings?.strongBuy ?? 0,
    analystBuy: ov.analystRatings?.buy ?? 0,
    analystHold: ov.analystRatings?.hold ?? 0,
    analystSell: ov.analystRatings?.sell ?? 0,
    analystStrongSell: ov.analystRatings?.strongSell ?? 0,
    sector: ov.sector ?? "",
    industry: ov.industry ?? "",
    source: "overview",
    updatedAt: new Date().toISOString(),
  };
}

const FUNDAMENTALS_ASSET_TYPES = new Set<HoldingAssetType>(["stock", "etf"]);

export function holdingNeedsFundamentals(h: Pick<Holding, "assetType">): boolean {
  return FUNDAMENTALS_ASSET_TYPES.has(h.assetType ?? "stock");
}

/** Trailing P/E useful for “cheap” sorts: drop missing and non-positive. */
export function sortablePe(pe: number | null | undefined): number | null {
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;
  return pe;
}

export function compareNullable(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: "asc" | "desc",
): number {
  const aOk = a != null && Number.isFinite(a);
  const bOk = b != null && Number.isFinite(b);
  if (!aOk && !bOk) return 0;
  if (!aOk) return 1;
  if (!bOk) return -1;
  return (dir === "asc" ? 1 : -1) * (a - b);
}

export interface HoldingResearchView {
  holding: Holding;
  fundamentals: HoldingsResearchFundamentals;
  price: number | null;
  valueEUR: number;
  weightPct: number;
  dayChangePct: number | null;
  returnPct: number | null;
  returnAbsEUR: number | null;
  pctFromHigh: number | null;
  pctFromLow: number | null;
  analystUpsidePct: number | null;
  estimatedDivIncomeEUR: number | null;
}

export function holdingPositionValueEUR(
  holding: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): number {
  const quote = quotes[holding.ticker];
  if (quote && Number.isFinite(quote.regularMarketPrice)) {
    const ccy = resolveQuoteCurrency(holding.displayCurrency, quote.currency);
    const eur = convertToEUR(holding.shares * quote.regularMarketPrice, ccy, exchangeRates);
    if (Number.isFinite(eur)) return eur;
  }
  return Number.isFinite(holding.valueInEUR) ? holding.valueInEUR : 0;
}

export function buildResearchViews(
  holdings: Holding[],
  fundamentalsById: Map<string, HoldingsResearchFundamentals>,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): HoldingResearchView[] {
  const values = holdings.map((h) => holdingPositionValueEUR(h, quotes, exchangeRates));
  const total = values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);

  return holdings.map((holding, i) => {
    const quote = quotes[holding.ticker];
    const price = quote && Number.isFinite(quote.regularMarketPrice) ? quote.regularMarketPrice : null;
    const valueEUR = values[i] ?? 0;
    const fundamentals = fundamentalsById.get(holding.id) ?? emptyFundamentals();
    const sector = fundamentals.sector || holding.sector || "";
    const merged: HoldingsResearchFundamentals = { ...fundamentals, sector };

    const purchase = holding.purchasePrice;
    let returnPct: number | null = null;
    let returnAbsEUR: number | null = null;
    if (price != null && purchase > 0) {
      returnPct = ((price - purchase) / purchase) * 100;
      const ccy = resolveQuoteCurrency(holding.displayCurrency, quote?.currency);
      const abs = convertToEUR(holding.shares * (price - purchase), ccy, exchangeRates);
      returnAbsEUR = Number.isFinite(abs) ? abs : null;
    }

    const high = merged.fiftyTwoWeekHigh;
    const low = merged.fiftyTwoWeekLow;
    const pctFromHigh =
      price != null && high != null && high > 0 ? ((price - high) / high) * 100 : null;
    const pctFromLow =
      price != null && low != null && low > 0 ? ((price - low) / low) * 100 : null;

    const target = merged.analystTargetPrice;
    const analystUpsidePct =
      price != null && price > 0 && target != null && target > 0
        ? ((target - price) / price) * 100
        : null;

    const yieldDec = merged.dividendYield;
    const estimatedDivIncomeEUR =
      yieldDec != null && Number.isFinite(yieldDec) && yieldDec > 0
        ? valueEUR * yieldDec
        : null;

    return {
      holding,
      fundamentals: merged,
      price,
      valueEUR,
      weightPct: total > 0 ? (valueEUR / total) * 100 : 0,
      dayChangePct:
        quote && Number.isFinite(quote.regularMarketChangePercent)
          ? quote.regularMarketChangePercent
          : null,
      returnPct,
      returnAbsEUR,
      pctFromHigh,
      pctFromLow,
      analystUpsidePct,
      estimatedDivIncomeEUR,
    };
  });
}

export function sortResearchViews(
  rows: HoldingResearchView[],
  key: HoldingsResearchSortKey,
  dir: "asc" | "desc",
): HoldingResearchView[] {
  return [...rows].sort((a, b) => {
    switch (key) {
      case "name":
        return (dir === "asc" ? 1 : -1) * a.holding.name.localeCompare(b.holding.name);
      case "peRatio":
        return compareNullable(sortablePe(a.fundamentals.peRatio), sortablePe(b.fundamentals.peRatio), dir);
      case "forwardPe":
        return compareNullable(
          sortablePe(a.fundamentals.forwardPe),
          sortablePe(b.fundamentals.forwardPe),
          dir,
        );
      case "pegRatio":
        return compareNullable(
          sortablePe(a.fundamentals.pegRatio),
          sortablePe(b.fundamentals.pegRatio),
          dir,
        );
      case "positionValue":
        return compareNullable(a.valueEUR, b.valueEUR, dir);
      case "weightPct":
        return compareNullable(a.weightPct, b.weightPct, dir);
      case "dividendYield":
        return compareNullable(a.fundamentals.dividendYield, b.fundamentals.dividendYield, dir);
      case "sectorSize": {
        const sec = (dir === "asc" ? 1 : -1) *
          (a.fundamentals.sector || "\uffff").localeCompare(b.fundamentals.sector || "\uffff");
        if (sec !== 0) return sec;
        return compareNullable(a.fundamentals.marketCap, b.fundamentals.marketCap, "desc");
      }
      case "dayChange":
        return compareNullable(a.dayChangePct, b.dayChangePct, dir);
      case "returnPct":
        return compareNullable(a.returnPct, b.returnPct, dir);
      case "returnAbs":
        return compareNullable(a.returnAbsEUR, b.returnAbsEUR, dir);
      case "beta":
        return compareNullable(a.fundamentals.beta, b.fundamentals.beta, dir);
      case "pctFromHigh":
        return compareNullable(a.pctFromHigh, b.pctFromHigh, dir);
      case "analystUpside":
        return compareNullable(a.analystUpsidePct, b.analystUpsidePct, dir);
      case "roe":
        return compareNullable(a.fundamentals.returnOnEquity, b.fundamentals.returnOnEquity, dir);
      case "profitMargin":
        return compareNullable(a.fundamentals.profitMargin, b.fundamentals.profitMargin, dir);
      default:
        return 0;
    }
  });
}

export const HOLDINGS_EXPLORER_METRIC_KEYS = [
  "holding",
  "positionValue",
  "weightPct",
  "dayChange",
  "returnPct",
  "peRatio",
  "forwardPe",
  "pegRatio",
  "dividendYield",
  "divIncome",
  "sectorSize",
  "beta",
  "eps",
  "roe",
  "marketCap",
  "pctFromHigh",
  "analystUpside",
] as const;

export type HoldingsExplorerMetricKey = (typeof HOLDINGS_EXPLORER_METRIC_KEYS)[number];

export interface HoldingsExplorerRowSnapshot {
  valueEUR?: number;
  weightPct?: number;
  peRatio?: number | null;
  forwardPe?: number | null;
  pegRatio?: number | null;
  dividendYield?: number | null;
  sector?: string;
  beta?: number | null;
  returnOnEquity?: number | null;
  dayChangePct?: number | null;
  returnPct?: number | null;
}

export interface HoldingsExplorerSelection {
  holdingId: string;
  ticker: string;
  name: string;
  assetType?: HoldingAssetType;
  metricKey: HoldingsExplorerMetricKey;
  displayValue: string;
  numericValue: number | null;
  row: HoldingsExplorerRowSnapshot;
}

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

export function metricNumericValue(
  row: HoldingResearchView,
  key: HoldingsExplorerMetricKey,
): number | null {
  switch (key) {
    case "holding":
      return null;
    case "positionValue":
      return finiteOrNull(row.valueEUR);
    case "weightPct":
      return finiteOrNull(row.weightPct);
    case "dayChange":
      return finiteOrNull(row.dayChangePct);
    case "returnPct":
      return finiteOrNull(row.returnPct);
    case "peRatio":
      return sortablePe(row.fundamentals.peRatio);
    case "forwardPe":
      return sortablePe(row.fundamentals.forwardPe);
    case "pegRatio":
      return sortablePe(row.fundamentals.pegRatio);
    case "dividendYield":
      return finiteOrNull(row.fundamentals.dividendYield);
    case "divIncome":
      return finiteOrNull(row.estimatedDivIncomeEUR);
    case "sectorSize":
      return finiteOrNull(row.fundamentals.marketCap);
    case "beta":
      return finiteOrNull(row.fundamentals.beta);
    case "eps":
      return finiteOrNull(row.fundamentals.eps);
    case "roe":
      return finiteOrNull(row.fundamentals.returnOnEquity);
    case "marketCap":
      return finiteOrNull(row.fundamentals.marketCap);
    case "pctFromHigh":
      return finiteOrNull(row.pctFromHigh);
    case "analystUpside":
      return finiteOrNull(row.analystUpsidePct);
    default:
      return null;
  }
}

export function buildHoldingsExplorerRowSnapshot(
  row: HoldingResearchView,
  opts?: { stealth?: boolean },
): HoldingsExplorerRowSnapshot {
  const snap: HoldingsExplorerRowSnapshot = {
    weightPct: finiteOrNull(row.weightPct) ?? undefined,
    peRatio: sortablePe(row.fundamentals.peRatio),
    forwardPe: sortablePe(row.fundamentals.forwardPe),
    pegRatio: sortablePe(row.fundamentals.pegRatio),
    dividendYield: finiteOrNull(row.fundamentals.dividendYield),
    sector: (row.fundamentals.sector || row.holding.sector || "").slice(0, 80) || undefined,
    beta: finiteOrNull(row.fundamentals.beta),
    returnOnEquity: finiteOrNull(row.fundamentals.returnOnEquity),
    dayChangePct: finiteOrNull(row.dayChangePct),
    returnPct: finiteOrNull(row.returnPct),
  };
  if (!opts?.stealth) {
    const value = finiteOrNull(row.valueEUR);
    if (value != null) snap.valueEUR = value;
  }
  return snap;
}

export function buildHoldingsExplorerSelection(
  row: HoldingResearchView,
  metricKey: HoldingsExplorerMetricKey,
  displayValue: string,
  opts?: { stealth?: boolean },
): HoldingsExplorerSelection {
  const stealth = Boolean(opts?.stealth);
  const hideMoney = stealth && (metricKey === "positionValue" || metricKey === "divIncome");
  return {
    holdingId: row.holding.id,
    ticker: row.holding.ticker.slice(0, 32),
    name: (row.holding.name || "").slice(0, 120),
    assetType: row.holding.assetType ?? "stock",
    metricKey,
    displayValue: hideMoney ? "—" : displayValue.slice(0, 40),
    numericValue: hideMoney ? null : metricNumericValue(row, metricKey),
    row: buildHoldingsExplorerRowSnapshot(row, { stealth }),
  };
}

export function filterResearchViews(
  rows: HoldingResearchView[],
  opts: {
    query?: string;
    assetType?: HoldingAssetType | "all";
    sector?: string;
    tag?: string;
  },
): HoldingResearchView[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const type = opts.assetType ?? "all";
  const sector = (opts.sector ?? "").trim().toLowerCase();
  const tag = (opts.tag ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    if (type !== "all" && (row.holding.assetType ?? "stock") !== type) return false;
    if (sector && (row.fundamentals.sector || "").toLowerCase() !== sector) return false;
    if (tag) {
      const tags = (row.holding.tags ?? []).map((t) => t.toLowerCase());
      if (!tags.includes(tag)) return false;
    }
    if (!q) return true;
    const hay = `${row.holding.name} ${row.holding.ticker} ${row.fundamentals.sector}`.toLowerCase();
    return hay.includes(q);
  });
}
