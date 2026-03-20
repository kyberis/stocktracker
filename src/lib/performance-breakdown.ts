import type { ExchangeRates, Transaction } from "./types";
import { txAmountToBase, calculateFifoRealizedPL } from "./performance";

export interface PerformanceBreakdown {
  investedCapital: number;
  currentValue: number;
  priceGain: number;
  priceGainPercent: number;
  dividendIncome: number;
  dividendPercent: number;
  realizedPL: number;
  realizedPLPercent: number;
  totalFees: number;
  totalTaxes: number;
  totalReturn: number;
  totalReturnPercent: number;
}

/**
 * Aggregate a full performance breakdown from transactions and current portfolio totals.
 *
 * - investedCapital: net capital deployed (buys - sell proceeds) — matches the chart's invested line
 * - priceGain: unrealized change in value of current holdings
 * - dividendIncome: sum of dividend payments received (net of withholding)
 * - realizedPL: FIFO-based realized profit/loss from sells
 * - totalFees/totalTaxes: aggregated across all transaction types
 * - totalReturn: currentValue - investedCapital
 */
export function aggregatePerformanceBreakdown(
  transactions: Transaction[],
  currentValue: number,
  _totalCost: number,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): PerformanceBreakdown {
  let buyTotal = 0;
  let sellProceeds = 0;
  let dividendIncome = 0;
  let totalFees = 0;
  let totalTaxes = 0;

  for (const tx of transactions) {
    const amount = txAmountToBase(tx.totalAmount, tx, baseCurrency, exchangeRates);
    const fees = txAmountToBase(tx.fees || 0, tx, baseCurrency, exchangeRates);
    const taxes = txAmountToBase(tx.taxes || 0, tx, baseCurrency, exchangeRates);

    totalFees += fees;
    totalTaxes += taxes;

    switch (tx.type) {
      case "buy":
        buyTotal += amount + fees + taxes;
        break;
      case "sell":
        sellProceeds += amount - fees - taxes;
        break;
      case "dividend":
        dividendIncome += amount - taxes;
        break;
      case "fee":
        totalFees += amount;
        break;
    }
  }

  const fifoMap = calculateFifoRealizedPL(transactions, exchangeRates, baseCurrency);
  let realizedPL = 0;
  for (const entry of fifoMap.values()) {
    realizedPL += entry.realizedGainBase;
  }

  const investedCapital = buyTotal - sellProceeds;
  const priceGain = currentValue - investedCapital;
  const totalReturn = currentValue - investedCapital;
  const totalReturnPercent = investedCapital > 0 ? (totalReturn / investedCapital) * 100 : 0;
  const priceGainPercent = investedCapital > 0 ? (priceGain / investedCapital) * 100 : 0;
  const dividendPercent = investedCapital > 0 ? (dividendIncome / investedCapital) * 100 : 0;
  const realizedPLPercent = investedCapital > 0 ? (realizedPL / investedCapital) * 100 : 0;

  return {
    investedCapital,
    currentValue,
    priceGain,
    priceGainPercent,
    dividendIncome,
    dividendPercent,
    realizedPL,
    realizedPLPercent,
    totalFees,
    totalTaxes,
    totalReturn,
    totalReturnPercent,
  };
}

export interface AnnualReturn {
  year: number;
  startValue: number;
  endValue: number;
  returnPct: number;
  absoluteReturn: number;
}

/**
 * Calculate per-year returns from portfolio snapshots.
 * Each snapshot must have { date: "YYYY-MM-DD", value: number, invested: number }.
 * Groups by calendar year and computes (endValue - startValue) / startValue for each year.
 */
export function calculateAnnualReturns(
  snapshots: { date: string; value: number; invested: number }[],
): AnnualReturn[] {
  if (snapshots.length < 2) return [];

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

  const byYear = new Map<number, { first: typeof sorted[0]; last: typeof sorted[0] }>();
  for (const snap of sorted) {
    const year = parseInt(snap.date.slice(0, 4), 10);
    const entry = byYear.get(year);
    if (!entry) {
      byYear.set(year, { first: snap, last: snap });
    } else {
      entry.last = snap;
    }
  }

  const years = [...byYear.keys()].sort();
  const results: AnnualReturn[] = [];

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const entry = byYear.get(year)!;

    const startValue = i === 0
      ? entry.first.value
      : byYear.get(years[i - 1])!.last.value;
    const endValue = entry.last.value;

    const returnPct = startValue > 0
      ? ((endValue - startValue) / startValue) * 100
      : 0;

    results.push({
      year,
      startValue,
      endValue,
      returnPct,
      absoluteReturn: endValue - startValue,
    });
  }

  return results;
}

/**
 * Filter transactions to those within a specific year.
 */
export function filterTransactionsByYear(
  transactions: Transaction[],
  year: number,
): Transaction[] {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return transactions.filter((tx) => tx.date >= start && tx.date <= end);
}
