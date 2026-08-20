export type MetricUnit = "x" | "pct" | "pp" | "usd" | "count" | "years";

export type MetricPeriodKind = "FY" | "TTM" | "Q" | "SPOT" | "CAGR";

export type MetricStatus = "ok" | "warn" | "error";

export type MetricId =
  | "roic"
  | "interestCoverage"
  | "netDebtToEbitda"
  | "fcfToNetIncome"
  | "fcfYield"
  | "revenueCagr"
  | "shareCountCagr"
  | "grossMarginVol"
  | "peCurrent"
  | "peHistoric"
  | "drawdown52w"
  | "targetUpside";

export interface MetricPeriod {
  kind: MetricPeriodKind;
  /** Always rendered next to the number, e.g. "FY2025" or "CAGR FY2022→FY2025". */
  label: string;
  /** Date of the observation, not of the screening run. */
  asOf: string;
}

export interface MetricSource {
  provider: "fmp" | "yahoo" | "derived";
  endpoint: string;
  filingDate?: string;
}

/**
 * Envelope that every thesis number must wear before copy can mention it.
 * A naked number is a bug.
 */
export interface Metric {
  id: MetricId;
  /** `null` is valid and renders as n/d. Never treat as 0 or omit the row. */
  value: number | null;
  unit: MetricUnit;
  period: MetricPeriod;
  source: MetricSource;
  formula: string;
  status: MetricStatus;
  flags: string[];
}

export interface StatementYear {
  year: number;
  filingDate?: string;
  revenue: number | null;
  ebit: number | null;
  interestExpense: number | null;
  ebitda: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  grossMarginPct: number | null;
  sharesDiluted: number | null;
  totalDebt: number | null;
  cash: number | null;
  shortTermInvestments: number | null;
  totalEquity: number | null;
  incomeTaxExpense: number | null;
  incomeBeforeTax: number | null;
  annualPe: number | null;
  eps: number | null;
}

export interface MarketSnapshot {
  price: number | null;
  epsTtm: number | null;
  high52w: number | null;
  targetPrice: number | null;
  targetAsOf?: string;
  marketCap: number | null;
  asOf: string;
  sector?: string | null;
  industry?: string | null;
}

/** TTM fallbacks. Used only when the statement formula cannot produce a value. */
export interface TtmFallback {
  interestCoverage: number | null;
  netDebtToEbitda: number | null;
  fcfYieldFraction: number | null;
  roicPct: number | null;
}

export interface ValidateContext {
  ticker?: string;
  ebit?: number | null;
  previousTotalDebt?: number | null;
  currentTotalDebt?: number | null;
  sector?: string | null;
  industry?: string | null;
  now?: string;
}
