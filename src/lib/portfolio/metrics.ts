/**
 * Single source of truth for portfolio headline metrics (TRF-004).
 * UI surfaces must consume these helpers instead of re-deriving totals / day change / yield.
 */

import { computeDayChangeHeadline } from "@/lib/day-change-pct";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";
import { clampDividendYieldPct, sanitizePrice } from "@/lib/portfolio/sanity";
import { computeTaxonomyAllocations } from "@/lib/services/taxonomy";
import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";

export interface PortfolioTotalResult {
  /** Invested assets only (excludes cash). */
  invested: number;
  /** Invested + cash. */
  netWorth: number;
  /** Cash portion in base currency. */
  cash: number;
  totalCost: number;
}

export interface DayChangeResult {
  amount: number;
  pct: number;
  /** Prior close total used as % denominator (invested positions included in the calc). */
  priorCloseTotal: number;
}

export function getPortfolioTotal(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): PortfolioTotalResult {
  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const cash = cashEntries.reduce(
    (sum, c) => sum + convertCurrency(c.amountEUR, "EUR", baseCurrency, exchangeRates),
    0,
  );
  const invested = Math.max(0, totals.totalCurrentEUR - cash);
  return {
    invested,
    netWorth: totals.totalCurrentEUR,
    cash,
    totalCost: totals.totalCostEUR,
  };
}

export function getDayChange(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  now?: Date,
): DayChangeResult {
  const headline = computeDayChangeHeadline(holdings, quotes, exchangeRates, baseCurrency, now);
  const priorCloseTotal =
    Math.abs(headline.pct) > 1e-9
      ? headline.abs / (headline.pct / 100)
      : (() => {
          // Flat day — reconstruct prior from current − amount
          let current = 0;
          for (const h of holdings) {
            const q = quotes[h.ticker];
            const price = sanitizePrice(q?.regularMarketPrice);
            if (price == null) continue;
            const ccy = resolveQuoteCurrency(h.displayCurrency, q?.currency);
            current += convertCurrency(Math.abs(h.shares * price), ccy, baseCurrency, exchangeRates);
          }
          return Math.max(0, current - headline.abs);
        })();
  return {
    amount: headline.abs,
    pct: headline.pct,
    priorCloseTotal,
  };
}

/** Portfolio trailing dividend yield (%) or null when unavailable / out of range. */
export function getDividendYield(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
  investedTotal?: number,
): number | null {
  const invested =
    investedTotal ??
    getPortfolioTotal(holdings, [], quotes, exchangeRates, baseCurrency).invested;
  if (invested <= 0) return null;

  let annualDivBase = 0;
  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (!q?.trailingAnnualDividendRate || q.trailingAnnualDividendRate <= 0) continue;
    const divCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency || h.displayCurrency);
    const divLocal = q.trailingAnnualDividendRate * h.shares;
    annualDivBase += convertCurrency(divLocal, divCurrency, baseCurrency, exchangeRates);
  }
  return clampDividendYieldPct((annualDivBase / invested) * 100);
}

export function getHoldingsCount(holdings: Holding[]): number {
  return holdings.length;
}

export function getEstimatedAnnualDividendIncome(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): number {
  let annualDivBase = 0;
  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (!q?.trailingAnnualDividendRate || q.trailingAnnualDividendRate <= 0) continue;
    const divCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency || h.displayCurrency);
    annualDivBase += convertCurrency(
      q.trailingAnnualDividendRate * h.shares,
      divCurrency,
      baseCurrency,
      exchangeRates,
    );
  }
  return annualDivBase;
}

export interface SectorBreakdownRow {
  label: string;
  valueEUR: number;
  percent: number;
}

/** Sector allocation via taxonomy (crypto excluded from sector buckets — TRF-018). */
export function getSectorBreakdown(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  unclassifiedLabel = "Unclassified",
): SectorBreakdownRow[] {
  return computeTaxonomyAllocations(holdings, quotes, exchangeRates, "sector", unclassifiedLabel).map(
    (a) => ({
      label: a.label,
      valueEUR: a.valueEUR,
      percent: a.percent,
    }),
  );
}
