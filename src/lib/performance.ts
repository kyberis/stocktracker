import type { ExchangeRates, HistoricalDataPoint, Holding, Transaction } from "./types";
import { convertToEUR } from "./utils";

/**
 * Modified Dietz Rate of Return.
 *
 * This is the industry-standard approximation of TTWROR when intra-period
 * portfolio valuations are not available. It weights each external cash flow
 * by the fraction of the period remaining after the flow occurred.
 *
 *   R = (V_end - V_start - CF) / (V_start + sum(w_i * cf_i))
 *
 * Where w_i = (T - t_i) / T  (fraction of total days remaining).
 *
 * Returns a percentage (e.g. 12.5 for +12.5%).
 */
export function calculateTTWROR(
  transactions: Transaction[],
  currentValueEUR: number,
  totalInvestedEUR: number
): number {
  if (totalInvestedEUR <= 0 || transactions.length === 0) return 0;

  const sorted = [...transactions]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return totalInvestedEUR > 0
      ? ((currentValueEUR - totalInvestedEUR) / totalInvestedEUR) * 100
      : 0;
  }

  const firstDate = new Date(sorted[0].date).getTime();
  const today = Date.now();
  const totalDays = Math.max((today - firstDate) / 86400000, 1);

  let netCashFlow = 0;
  let weightedCashFlow = 0;

  for (const tx of sorted) {
    const flow =
      tx.type === "buy"
        ? tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)
        : -(tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0));

    const txDate = new Date(tx.date).getTime();
    const daysSinceStart = Math.max((txDate - firstDate) / 86400000, 0);
    const weight = (totalDays - daysSinceStart) / totalDays;

    netCashFlow += flow;
    weightedCashFlow += weight * flow;
  }

  const denominator = weightedCashFlow;
  if (Math.abs(denominator) < 0.01) {
    return totalInvestedEUR > 0
      ? ((currentValueEUR - totalInvestedEUR) / totalInvestedEUR) * 100
      : 0;
  }

  const modifiedDietz = (currentValueEUR - netCashFlow) / denominator;
  return modifiedDietz * 100;
}

/**
 * Internal Rate of Return via Newton-Raphson XIRR.
 * Takes dated cash flows (negative = outflow, positive = inflow).
 * Returns annualized rate as percentage (e.g. 8.5 for +8.5%).
 *
 * Returns null when the time span is too short for meaningful annualization
 * (< 7 days between first and last cash flow).
 */
export function calculateXIRR(
  cashFlows: { date: Date; amount: number }[]
): number | null {
  if (cashFlows.length < 2) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const d0 = sorted[0].date.getTime();
  const dN = sorted[sorted.length - 1].date.getTime();

  const spanDays = (dN - d0) / 86400000;
  if (spanDays < 7) return null;

  function yearFrac(d: Date): number {
    return (d.getTime() - d0) / (365.25 * 86400000);
  }

  function npv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      return sum + cf.amount / Math.pow(1 + rate, t);
    }, 0);
  }

  function dnpv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      if (t === 0) return sum;
      return sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const val = npv(rate);
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-12) break;
    const newRate = rate - val / deriv;
    if (Math.abs(newRate - rate) < 1e-8) {
      rate = newRate;
      break;
    }
    rate = newRate;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate * 100;
}

/**
 * Build XIRR cash flows from transactions + current portfolio value.
 */
export function buildXIRRCashFlows(
  transactions: Transaction[],
  currentValueEUR: number
): { date: Date; amount: number }[] {
  const flows: { date: Date; amount: number }[] = [];

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;

    switch (tx.type) {
      case "buy":
        flows.push({ date: d, amount: -(tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)) });
        break;
      case "sell":
        flows.push({ date: d, amount: tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0) });
        break;
      case "dividend":
        flows.push({ date: d, amount: tx.totalAmount });
        break;
      case "fee":
        flows.push({ date: d, amount: -tx.totalAmount });
        break;
    }
  }

  if (currentValueEUR > 0) {
    flows.push({ date: new Date(), amount: currentValueEUR });
  }

  return flows;
}

/**
 * Find the close price on or before a given date from a sorted series.
 * Returns null if no data exists at or before the date.
 */
export function closeOnOrBeforeDate(
  series: HistoricalDataPoint[],
  date: string
): number | null {
  if (series.length === 0) return null;
  let result: number | null = null;
  for (const point of series) {
    if (point.date <= date) {
      result = point.close;
    } else {
      break;
    }
  }
  return result;
}

export interface HoldingSeriesEntry {
  holding: Holding;
  series: HistoricalDataPoint[];
}

/**
 * Compute portfolio value in EUR on a given date using historical close prices.
 * Projects current holdings backward — does not account for sold positions.
 * Cash is excluded (no historical cash balance available).
 */
export function calculatePortfolioValueOnDate(
  entries: HoldingSeriesEntry[],
  date: string,
  exchangeRates: ExchangeRates
): number {
  let sumEUR = 0;
  for (const item of entries) {
    const close = closeOnOrBeforeDate(item.series, date);
    if (close == null || close <= 0) continue;
    const value = item.holding.shares * close;
    sumEUR += convertToEUR(value, item.holding.displayCurrency, exchangeRates);
  }
  return sumEUR;
}

/**
 * Simple period return: (end - start) / start * 100.
 * Returns null when startValue <= 0 or invalid.
 */
export function calculatePeriodReturn(
  currentValueEUR: number,
  valueOnDateEUR: number
): number | null {
  if (valueOnDateEUR <= 0 || !Number.isFinite(currentValueEUR)) return null;
  return ((currentValueEUR - valueOnDateEUR) / valueOnDateEUR) * 100;
}
