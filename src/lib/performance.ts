import type { ExchangeRates, HistoricalDataPoint, Holding, Transaction } from "./types";
import { convertToEUR } from "./utils";

/**
 * Convert a transaction amount to EUR using the stored historical rate when
 * available, falling back to current exchange rates.
 */
function txAmountToEUR(amount: number, tx: Transaction, exchangeRates: ExchangeRates): number {
  const cur = tx.currency || "EUR";
  if (cur === "EUR") return amount;
  if (tx.exchangeRateEur && tx.exchangeRateEur > 0) return amount / tx.exchangeRateEur;
  return convertToEUR(amount, cur, exchangeRates);
}

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
  totalInvestedEUR: number,
  exchangeRates: ExchangeRates
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
    const amount = txAmountToEUR(tx.totalAmount, tx, exchangeRates);
    const fees = txAmountToEUR(tx.fees || 0, tx, exchangeRates);
    const taxes = txAmountToEUR(tx.taxes || 0, tx, exchangeRates);

    const flow =
      tx.type === "buy"
        ? amount + fees + taxes
        : -(amount - fees - taxes);

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

  const result = ((currentValueEUR - netCashFlow) / denominator) * 100;

  if (!Number.isFinite(result) || Math.abs(result) > 1000) {
    return totalInvestedEUR > 0
      ? ((currentValueEUR - totalInvestedEUR) / totalInvestedEUR) * 100
      : 0;
  }

  return result;
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
  let converged = false;
  for (let i = 0; i < 100; i++) {
    const val = npv(rate);
    if (Math.abs(val) < 1e-6) {
      converged = true;
      break;
    }
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-12) break;
    const newRate = rate - val / deriv;
    if (Math.abs(newRate - rate) < 1e-8) {
      rate = newRate;
      converged = true;
      break;
    }
    rate = newRate;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  if (!converged) return null;
  return rate * 100;
}

/**
 * Build XIRR cash flows from transactions + current portfolio value.
 */
export function buildXIRRCashFlows(
  transactions: Transaction[],
  currentValueEUR: number,
  exchangeRates: ExchangeRates
): { date: Date; amount: number }[] {
  const flows: { date: Date; amount: number }[] = [];

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;

    const amount = txAmountToEUR(tx.totalAmount, tx, exchangeRates);
    const fees = txAmountToEUR(tx.fees || 0, tx, exchangeRates);
    const taxes = txAmountToEUR(tx.taxes || 0, tx, exchangeRates);

    switch (tx.type) {
      case "buy":
        flows.push({ date: d, amount: -(amount + fees + taxes) });
        break;
      case "sell":
        flows.push({ date: d, amount: amount - fees - taxes });
        break;
      case "dividend":
        flows.push({ date: d, amount: amount - taxes });
        break;
      case "fee":
        flows.push({ date: d, amount: -amount });
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

/**
 * Annualized Volatility of daily returns.
 * Computed as stdDev(dailyReturns) × sqrt(252) — percentage.
 * Returns null when fewer than 2 data points are provided.
 */
export function calculateAnnualizedVolatility(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 2) return null;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  return stdDev * Math.sqrt(252);
}

/**
 * Sharpe Ratio: (annualizedReturn - riskFreeRate) / annualizedVolatility.
 * All inputs are percentages (e.g. 12.5 for 12.5%).
 * Returns null when volatility is zero or insufficient data.
 */
export function calculateSharpeRatio(
  dailyReturns: number[],
  riskFreeRatePct: number
): number | null {
  const vol = calculateAnnualizedVolatility(dailyReturns);
  if (vol == null || vol === 0) return null;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const annualizedReturn = mean * 252;
  return (annualizedReturn - riskFreeRatePct) / vol;
}

/**
 * Max Drawdown: maximum peak-to-trough decline in portfolio values.
 * Returns a negative percentage (e.g. -23.4 for a 23.4% drawdown).
 * Returns null when fewer than 2 values are provided.
 */
export function calculateMaxDrawdown(portfolioValues: number[]): number | null {
  if (portfolioValues.length < 2) return null;
  let peak = portfolioValues[0];
  let maxDD = 0;
  for (const v of portfolioValues) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (v - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

/**
 * Beta: ratio of portfolio return covariance with benchmark to benchmark variance.
 * Both arrays are daily returns in percentage.
 * Returns null when fewer than 2 paired data points are provided or variance is zero.
 */
export function calculateBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number | null {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return null;

  const pReturns = portfolioReturns.slice(0, n);
  const bReturns = benchmarkReturns.slice(0, n);

  const pMean = pReturns.reduce((s, r) => s + r, 0) / n;
  const bMean = bReturns.reduce((s, r) => s + r, 0) / n;

  let covariance = 0;
  let bVariance = 0;
  for (let i = 0; i < n; i++) {
    const pd = pReturns[i] - pMean;
    const bd = bReturns[i] - bMean;
    covariance += pd * bd;
    bVariance += bd * bd;
  }
  covariance /= n - 1;
  bVariance /= n - 1;

  if (bVariance < 1e-15) return null;
  return covariance / bVariance;
}

/**
 * Compute daily returns from an array of portfolio values.
 * Returns (v[i] - v[i-1]) / v[i-1] * 100 for each consecutive pair.
 */
export function computeDailyReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      returns.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
    }
  }
  return returns;
}

/* ── FIFO Realized P&L ─────────────────────────────────────── */

export interface FifoLot {
  date: string;
  shares: number;
  costPerShareEUR: number;
}

export interface RealizedPL {
  ticker: string;
  transactionId: string;
  sellDate: string;
  sharesSold: number;
  proceedsEUR: number;
  costBasisEUR: number;
  realizedGainEUR: number;
}

/**
 * Calculate FIFO realized P&L for all sell transactions.
 *
 * Rules (financial-calculations skill):
 * - Cost per lot = (shares × purchasePrice + fees + taxes) converted to EUR.
 * - Use tx.exchangeRateEur when available (historical rate), fall back to exchangeRates.
 * - GBX: divide price by 100 before GBP/EUR conversion.
 * - Missing rate guard: if rate cannot be determined, skip the lot/sell and return null for that tx.
 * - Raw gain/loss only — no tax fabrication.
 */
export function calculateFifoRealizedPL(
  transactions: Transaction[],
  exchangeRates: ExchangeRates
): Map<string, RealizedPL> {
  const result = new Map<string, RealizedPL>();

  const sorted = [...transactions]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });

  // Per-ticker FIFO lot queue
  const lots = new Map<string, FifoLot[]>();

  function resolveEURAmount(amount: number, tx: Transaction): number | null {
    const cur = (tx.displayCurrency || tx.currency || "EUR").toUpperCase();
    if (cur === "EUR") return amount;

    // GBX: divide by 100 first (pence → pounds)
    const normalizedAmount = (cur === "GBX" || cur === "GBP")
      ? (cur === "GBX" ? amount / 100 : amount)
      : amount;
    const normalizedCur = cur === "GBX" ? "GBP" : cur;

    if (normalizedCur === "EUR") return normalizedAmount;

    // Prefer historical stored rate
    if (tx.exchangeRateEur && tx.exchangeRateEur > 0) {
      return normalizedAmount / tx.exchangeRateEur;
    }

    // Fall back to live exchange rates
    const rateKey = `EUR${normalizedCur}`;
    if (!exchangeRates[rateKey]) return null; // missing rate guard
    const convertedAmount = convertToEUR(normalizedAmount, normalizedCur, exchangeRates);
    return convertedAmount;
  }

  for (const tx of sorted) {
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker) continue;

    if (tx.type === "buy" && tx.shares > 0) {
      // Cost per lot: totalAmount + fees + taxes, all converted to EUR
      const totalCost = tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const totalCostEUR = resolveEURAmount(totalCost, tx);
      if (totalCostEUR == null) continue; // missing rate — skip lot

      const costPerShareEUR = totalCostEUR / tx.shares;
      const tickerLots = lots.get(ticker) || [];
      tickerLots.push({ date: tx.date, shares: tx.shares, costPerShareEUR });
      lots.set(ticker, tickerLots);
    } else if (tx.type === "sell" && tx.shares > 0) {
      const tickerLots = lots.get(ticker);
      if (!tickerLots || tickerLots.length === 0) continue;

      // Sell proceeds = (totalAmount - fees - taxes) in EUR
      const proceeds = tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0);
      const proceedsEUR = resolveEURAmount(proceeds, tx);
      if (proceedsEUR == null) continue; // missing rate — skip

      let remainingToSell = tx.shares;
      let costBasisEUR = 0;

      while (remainingToSell > 0 && tickerLots.length > 0) {
        const lot = tickerLots[0];
        const soldFromLot = Math.min(remainingToSell, lot.shares);
        costBasisEUR += soldFromLot * lot.costPerShareEUR;
        lot.shares -= soldFromLot;
        remainingToSell -= soldFromLot;
        if (lot.shares <= 0) tickerLots.shift();
      }

      lots.set(ticker, tickerLots);

      result.set(tx.id, {
        ticker,
        transactionId: tx.id,
        sellDate: tx.date,
        sharesSold: tx.shares - remainingToSell,
        proceedsEUR,
        costBasisEUR,
        realizedGainEUR: proceedsEUR - costBasisEUR,
      });
    }
  }

  return result;
}
