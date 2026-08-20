import type { HardDataCandidate } from "@/lib/screening/schemas";
import { computeThesisMetrics } from "./compute";
import type { Metric, StatementYear } from "./types";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function yearFromRow(row: {
  year?: number | null;
  ebit?: number | null;
  interestExpense?: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
  totalDebt?: number | null;
  cash?: number | null;
  shortTermInvestments?: number | null;
  totalEquity?: number | null;
  incomeTaxExpense?: number | null;
  incomeBeforeTax?: number | null;
  annualPe?: number | null;
  filingDate?: string | null;
  revenue: number | null;
  freeCashFlow: number | null;
  grossMarginPct: number | null;
  netMarginPct?: number | null;
  sharesOutstanding: number | null;
  eps: number | null;
}): StatementYear | null {
  if (row.year == null) return null;
  return {
    year: row.year,
    filingDate: row.filingDate ?? undefined,
    revenue: num(row.revenue),
    ebit: num(row.ebit),
    interestExpense: num(row.interestExpense),
    ebitda: num(row.ebitda),
    netIncome:
      num(row.netIncome) ??
      (num(row.revenue) != null && num(row.netMarginPct) != null
        ? (row.revenue as number) * ((row.netMarginPct as number) / 100)
        : null),
    freeCashFlow: num(row.freeCashFlow),
    grossMarginPct: num(row.grossMarginPct),
    sharesDiluted: num(row.sharesOutstanding),
    totalDebt: num(row.totalDebt),
    cash: num(row.cash),
    shortTermInvestments: num(row.shortTermInvestments),
    totalEquity: num(row.totalEquity),
    incomeTaxExpense: num(row.incomeTaxExpense),
    incomeBeforeTax: num(row.incomeBeforeTax),
    annualPe: num(row.annualPe),
    eps: num(row.eps),
  };
}

/** Map a Hard Data candidate onto the metric engine. */
export function metricsFromCandidate(
  candidate: HardDataCandidate,
  asOf: string,
): Metric[] {
  const years = (candidate.annualSeries ?? [])
    .map((row) => yearFromRow(row))
    .filter((y): y is StatementYear => y != null);
  return computeThesisMetrics({
    ticker: candidate.ticker,
    years,
    market: {
      price: num(candidate.price),
      epsTtm: num(candidate.epsTtm),
      high52w: num(candidate.yearHigh),
      targetPrice: num(candidate.targetPrice),
      marketCap: num(candidate.marketCapUsd),
      asOf,
      sector: candidate.sector,
      industry: candidate.industry,
    },
    ttm: {
      interestCoverage: num(candidate.interestCoverage),
      netDebtToEbitda: num(candidate.ndEbitda),
      fcfYieldFraction: num(candidate.fcfYield),
      roicPct: num(candidate.roicPct),
    },
  });
}
