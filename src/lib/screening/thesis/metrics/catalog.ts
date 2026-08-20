import type { MetricId, MetricUnit } from "./types";

export interface CatalogRule {
  id: MetricId;
  formula: string;
  unit: MetricUnit;
  min: number;
  max: number;
  endpoint: string;
}

/**
 * One formula per metric. Hard range = outside it, status "error".
 * Percent metrics store percentage points (3.4 means 3.4%), never 0.034.
 */
export const METRIC_CATALOG: Record<MetricId, CatalogRule> = {
  roic: {
    id: "roic",
    formula: "NOPAT / (totalDebt + equity − cash); NOPAT = EBIT × (1 − effective tax)",
    unit: "pct",
    min: -100,
    max: 100,
    endpoint: "income-statement+balance-sheet-statement",
  },
  interestCoverage: {
    id: "interestCoverage",
    formula: "EBIT / |interestExpense|",
    unit: "x",
    min: -50,
    max: 200,
    endpoint: "income-statement",
  },
  netDebtToEbitda: {
    id: "netDebtToEbitda",
    formula: "(totalDebt − cash − shortTermInvestments) / EBITDA",
    unit: "x",
    min: -5,
    max: 20,
    endpoint: "balance-sheet-statement+income-statement",
  },
  fcfToNetIncome: {
    id: "fcfToNetIncome",
    formula: "median(FCF / netIncome) over 3 fiscal years with NI > 0",
    unit: "x",
    min: -10,
    max: 10,
    endpoint: "cash-flow-statement+income-statement",
  },
  fcfYield: {
    id: "fcfYield",
    formula: "FCF / (price × diluted shares)",
    unit: "pct",
    min: -50,
    max: 50,
    endpoint: "cash-flow-statement+quote",
  },
  revenueCagr: {
    id: "revenueCagr",
    formula: "(Rev_n / Rev_0)^(1/n) − 1, n ≥ 3 consecutive complete years",
    unit: "pct",
    min: -50,
    max: 100,
    endpoint: "income-statement",
  },
  shareCountCagr: {
    id: "shareCountCagr",
    formula: "(shares_n / shares_0)^(1/n) − 1, diluted, n ≥ 3 consecutive years",
    unit: "pct",
    min: -30,
    max: 50,
    endpoint: "income-statement",
  },
  grossMarginVol: {
    id: "grossMarginVol",
    formula: "sample standard deviation of gross margin, n ≥ 4",
    unit: "pp",
    min: 0,
    max: 50,
    endpoint: "income-statement",
  },
  peCurrent: {
    id: "peCurrent",
    formula: "price / diluted TTM EPS",
    unit: "x",
    min: -500,
    max: 500,
    endpoint: "quote+income-statement-ttm",
  },
  peHistoric: {
    id: "peHistoric",
    formula: "median annual P/E, skipping years with EPS ≤ 0",
    unit: "x",
    min: 0,
    max: 200,
    endpoint: "ratios",
  },
  drawdown52w: {
    id: "drawdown52w",
    formula: "price / 52-week high − 1",
    unit: "pct",
    min: -100,
    max: 0,
    endpoint: "quote",
  },
  targetUpside: {
    id: "targetUpside",
    formula: "consensus target / price − 1",
    unit: "pct",
    min: -90,
    max: 300,
    endpoint: "price-target-consensus",
  },
};

export type CoverageBand = "critical" | "tight" | "reasonable" | "ample";

/** Adjectives for interest coverage. Select, never invent. Only if status === "ok". */
export function coverageBand(value: number): CoverageBand {
  if (value < 1.5) return "critical";
  if (value < 3) return "tight";
  if (value <= 6) return "reasonable";
  return "ample";
}
