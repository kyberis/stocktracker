import type { ExchangeRates, HistoricalDataPoint, Holding, Transaction } from "./types";
import { convertToEUR, convertCurrency } from "./utils";

/**
 * Convert a transaction amount to EUR using the stored historical rate when
 * available, falling back to current exchange rates.
 */
export function txAmountToEUR(amount: number, tx: Transaction, exchangeRates: ExchangeRates): number {
  const cur = tx.currency || "EUR";
  if (cur === "EUR") return amount;
  if (tx.exchangeRateEur && tx.exchangeRateEur > 0) return amount / tx.exchangeRateEur;
  return convertToEUR(amount, cur, exchangeRates);
}

/**
 * Convert a transaction amount to the portfolio's base currency.
 * Uses the stored EUR historical rate as a fast-path when the base is EUR,
 * otherwise converts via the EUR pivot through convertCurrency.
 */
export function txAmountToBase(
  amount: number,
  tx: Transaction,
  baseCurrency: string,
  exchangeRates: ExchangeRates
): number {
  const cur = tx.currency || "EUR";
  if (cur === baseCurrency) return amount;
  if (baseCurrency === "EUR") return txAmountToEUR(amount, tx, exchangeRates);
  // For non-EUR base: convert to EUR first (using historical rate if available), then to base
  const inEUR = txAmountToEUR(amount, tx, exchangeRates);
  return convertCurrency(inEUR, "EUR", baseCurrency, exchangeRates);
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
  currentValue: number,
  totalInvested: number,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): number {
  if (totalInvested <= 0 || transactions.length === 0) return 0;

  const sorted = [...transactions]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return totalInvested > 0
      ? ((currentValue - totalInvested) / totalInvested) * 100
      : 0;
  }

  const firstDate = new Date(sorted[0].date).getTime();
  const today = Date.now();
  const totalDays = Math.max((today - firstDate) / 86400000, 1);

  let netCashFlow = 0;
  let weightedCashFlow = 0;

  for (const tx of sorted) {
    const amount = txAmountToBase(tx.totalAmount, tx, baseCurrency, exchangeRates);
    const fees = txAmountToBase(tx.fees || 0, tx, baseCurrency, exchangeRates);
    const taxes = txAmountToBase(tx.taxes || 0, tx, baseCurrency, exchangeRates);

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
    return totalInvested > 0
      ? ((currentValue - totalInvested) / totalInvested) * 100
      : 0;
  }

  const result = ((currentValue - netCashFlow) / denominator) * 100;

  // Sanity: Modified Dietz without V_start blows up when buy history is incomplete.
  // Fall back to simple return when TTWROR diverges wildly from (V - cost) / cost.
  const simpleReturn =
    totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  if (
    !Number.isFinite(result) ||
    Math.abs(result) > 1000 ||
    (Math.abs(simpleReturn) > 0.5 && Math.abs(result) > Math.abs(simpleReturn) * 5 + 25)
  ) {
    return simpleReturn;
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
  currentValue: number,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): { date: Date; amount: number }[] {
  const flows: { date: Date; amount: number }[] = [];

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;

    const amount = txAmountToBase(tx.totalAmount, tx, baseCurrency, exchangeRates);
    const fees = txAmountToBase(tx.fees || 0, tx, baseCurrency, exchangeRates);
    const taxes = txAmountToBase(tx.taxes || 0, tx, baseCurrency, exchangeRates);

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

  if (currentValue > 0) {
    flows.push({ date: new Date(), amount: currentValue });
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
 * Compute portfolio value in the base currency on a given date using historical close prices.
 * Projects current holdings backward — does not account for sold positions.
 * Cash is excluded (no historical cash balance available).
 */
export function calculatePortfolioValueOnDate(
  entries: HoldingSeriesEntry[],
  date: string,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): number {
  let sum = 0;
  for (const item of entries) {
    const close = closeOnOrBeforeDate(item.series, date);
    if (close == null || close <= 0) continue;
    const value = item.holding.shares * close;
    sum += convertCurrency(value, item.holding.displayCurrency, baseCurrency, exchangeRates);
  }
  return sum;
}

/**
 * Simple period return: (end - start) / start * 100.
 * Returns null when startValue <= 0 or invalid.
 *
 * Does not account for cash flows within the period — selling a position
 * (or moving money to/from another asset class) shows up as a "loss" here
 * even when nothing lost value; see calculateWindowedModifiedDietzReturn
 * for the flow-adjusted alternative (TRF-028).
 */
export function calculatePeriodReturn(
  currentValueEUR: number,
  valueOnDateEUR: number
): number | null {
  if (valueOnDateEUR <= 0 || !Number.isFinite(currentValueEUR)) return null;
  return ((currentValueEUR - valueOnDateEUR) / valueOnDateEUR) * 100;
}

/**
 * Modified Dietz return for an arbitrary [periodStart, periodEnd] window,
 * per asset-class bucket (TRF-028).
 *
 * Deliberately NOT a generalization of calculateTTWROR above: that function
 * is anchored to "since first transaction" → "today" and backs the
 * whole-portfolio TTWROR metric protected by non-regression item #8: reusing
 * it here would mean re-proving its empty-tx / near-zero-denominator /
 * divergence-clamp branches are preserved for a second, differently-shaped
 * caller. This duplicates the day-weighting math instead of sharing it.
 *
 * A sale within the window is treated as an outflow *from this bucket*
 * (Transaction.assetType), not a loss — the bug this fixes is exactly that
 * naive (end − start) / start reads "money left the ETF bucket" as "ETFs
 * crashed". Buying another asset class with the proceeds is correctly
 * invisible here: this is a segment/sleeve return, not a portfolio-level one.
 *
 * Known limitations (documented, not solved here):
 * - Assumes valueAtStart, valueAtEnd, and each flow's amount are already in
 *   the same currency basis. valueAtStart typically comes from a stored EUR
 *   snapshot, valueAtEnd from live quotes+FX, and flows from each
 *   transaction's stored exchangeRateEur — for a single-currency (EUR)
 *   portfolio these agree; a multi-currency portfolio can misattribute part
 *   of an FX move as return.
 * - moveHoldingToPortfolio reparents a holding's full transaction history to
 *   its new portfolio without recording a transfer event, so a moved
 *   holding's pre-move transactions appear as this portfolio's own flows.
 *
 * Returns null (render "—", never a number) when valueAtStart is
 * unavailable/non-positive or the weighted denominator is ~0 — there is no
 * mathematically honest return to show in either case.
 */
export function calculateWindowedModifiedDietzReturn(
  valueAtStart: number | null,
  valueAtEnd: number,
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): number | null {
  if (valueAtStart == null || !Number.isFinite(valueAtStart) || valueAtStart <= 0) return null;
  if (!Number.isFinite(valueAtEnd)) return null;

  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const totalDays = (endMs - startMs) / 86400000;

  const flows = transactions
    .filter((t) => t.type === "buy" || t.type === "sell")
    .filter((t) => t.date >= periodStart.slice(0, 10) && t.date <= periodEnd.slice(0, 10));

  let netCashFlow = 0;
  let weightedCashFlow = 0;

  for (const tx of flows) {
    const amount = txAmountToBase(tx.totalAmount, tx, baseCurrency, exchangeRates);
    const fees = txAmountToBase(tx.fees || 0, tx, baseCurrency, exchangeRates);
    const taxes = txAmountToBase(tx.taxes || 0, tx, baseCurrency, exchangeRates);

    const flow = tx.type === "buy" ? amount + fees + taxes : -(amount - fees - taxes);

    const txMs = new Date(tx.date).getTime();
    const daysSinceStart = Math.min(Math.max((txMs - startMs) / 86400000, 0), totalDays);
    const weight = (totalDays - daysSinceStart) / totalDays;

    netCashFlow += flow;
    weightedCashFlow += weight * flow;
  }

  const denominator = valueAtStart + weightedCashFlow;
  if (Math.abs(denominator) < 0.01) return null;

  const result = ((valueAtEnd - valueAtStart - netCashFlow) / denominator) * 100;
  if (!Number.isFinite(result)) return null;
  return result;
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
  costPerShareBase: number;
}

export interface RealizedPL {
  ticker: string;
  transactionId: string;
  sellDate: string;
  sharesSold: number;
  proceedsBase: number;
  costBasisBase: number;
  realizedGainBase: number;
}

/**
 * Calculate FIFO realized P&L for all sell transactions.
 *
 * Rules (financial-calculations skill):
 * - Cost per lot = (shares × purchasePrice + fees + taxes) converted to baseCurrency.
 * - Use tx.exchangeRateEur when available (historical rate), fall back to exchangeRates.
 * - GBX: divide price by 100 before GBP conversion.
 * - Missing rate guard: if rate cannot be determined, skip the lot/sell and return null for that tx.
 * - Raw gain/loss only — no tax fabrication.
 */
export function calculateFifoRealizedPL(
  transactions: Transaction[],
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): Map<string, RealizedPL> {
  const result = new Map<string, RealizedPL>();

  const sorted = [...transactions]
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });

  const lots = new Map<string, FifoLot[]>();

  function resolveBaseAmount(amount: number, tx: Transaction): number | null {
    const cur = (tx.displayCurrency || tx.currency || "EUR").toUpperCase();
    if (cur === baseCurrency) return amount;

    // GBX: divide by 100 first (pence → pounds)
    const normalizedAmount = (cur === "GBX" || cur === "GBP")
      ? (cur === "GBX" ? amount / 100 : amount)
      : amount;
    const normalizedCur = cur === "GBX" ? "GBP" : cur;

    if (normalizedCur === baseCurrency) return normalizedAmount;

    // Prefer historical stored rate for EUR path
    if (baseCurrency === "EUR" && tx.exchangeRateEur && tx.exchangeRateEur > 0) {
      return normalizedAmount / tx.exchangeRateEur;
    }

    // Fall back to live exchange rates via EUR pivot
    const rateKey = `EUR${normalizedCur}`;
    if (normalizedCur !== "EUR" && !exchangeRates[rateKey]) return null;
    const inEUR = normalizedCur === "EUR" ? normalizedAmount : convertToEUR(normalizedAmount, normalizedCur, exchangeRates);
    if (baseCurrency === "EUR") return inEUR;
    return convertCurrency(inEUR, "EUR", baseCurrency, exchangeRates);
  }

  for (const tx of sorted) {
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker) continue;

    if (tx.type === "buy" && tx.shares > 0) {
      const totalCost = tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const totalCostBase = resolveBaseAmount(totalCost, tx);
      if (totalCostBase == null) continue;

      const costPerShareBase = totalCostBase / tx.shares;
      const tickerLots = lots.get(ticker) || [];
      tickerLots.push({ date: tx.date, shares: tx.shares, costPerShareBase });
      lots.set(ticker, tickerLots);
    } else if (tx.type === "sell" && tx.shares > 0) {
      const tickerLots = lots.get(ticker);
      if (!tickerLots || tickerLots.length === 0) continue;

      const proceeds = tx.totalAmount - (tx.fees || 0) - (tx.taxes || 0);
      const proceedsBase = resolveBaseAmount(proceeds, tx);
      if (proceedsBase == null) continue;

      let remainingToSell = tx.shares;
      let costBasisBase = 0;

      while (remainingToSell > 0 && tickerLots.length > 0) {
        const lot = tickerLots[0];
        const soldFromLot = Math.min(remainingToSell, lot.shares);
        costBasisBase += soldFromLot * lot.costPerShareBase;
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
        proceedsBase,
        costBasisBase,
        realizedGainBase: proceedsBase - costBasisBase,
      });
    }
  }

  return result;
}
