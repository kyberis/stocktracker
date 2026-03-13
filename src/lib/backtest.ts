import type { HistoricalDataPoint } from "./types";
import {
  calculateMaxDrawdown,
  calculateSharpeRatio,
  computeDailyReturns,
} from "./performance";

/* ── Types ────────────────────────────────────────────────── */

export interface BacktestConfig {
  initialInvestment: number;
  monthlyContribution: number;
  reinvestDividends: boolean;
  /** Annual dividend yield as a decimal (0.02 = 2%) */
  dividendYield: number;
}

export interface BacktestPoint {
  date: string;
  /** Portfolio value at this date */
  value: number;
  /** Cumulative cost basis (total invested so far) */
  costBasis: number;
}

export interface BacktestYearReturn {
  year: number;
  returnPct: number;
}

export interface BacktestResult {
  series: BacktestPoint[];
  totalInvested: number;
  finalValue: number;
  totalReturnPct: number;
  cagr: number;
  maxDrawdownPct: number | null;
  sharpeRatio: number | null;
  dividendIncome: number;
  bestYear: BacktestYearReturn | null;
  worstYear: BacktestYearReturn | null;
  yearlyReturns: BacktestYearReturn[];
}

/* ── CAGR ─────────────────────────────────────────────────── */

export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/* ── DCA Backtest Simulation ──────────────────────────────── */

/**
 * Simulate a dollar-cost-averaging investment over a historical price series.
 *
 * Strategy:
 *  1. Buy `initialInvestment / price` shares on day 1.
 *  2. On the first trading day of each month, buy `monthlyContribution / price` shares.
 *  3. If `reinvestDividends`, add `dividendYield / 12 * portfolioValue` to shares monthly.
 *  4. Track portfolio value = shares × price at each data point.
 */
export function simulateDCA(
  prices: HistoricalDataPoint[],
  config: BacktestConfig
): BacktestResult {
  if (prices.length === 0) {
    return {
      series: [],
      totalInvested: 0,
      finalValue: 0,
      totalReturnPct: 0,
      cagr: 0,
      maxDrawdownPct: null,
      sharpeRatio: null,
      dividendIncome: 0,
      bestYear: null,
      worstYear: null,
      yearlyReturns: [],
    };
  }

  const { initialInvestment, monthlyContribution, reinvestDividends, dividendYield } = config;

  let shares = 0;
  let totalInvested = 0;
  let dividendIncome = 0;
  let lastMonth = -1;

  const series: BacktestPoint[] = [];
  const portfolioValues: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const { date, close } = prices[i];
    if (close <= 0) continue;

    const d = new Date(date);
    const month = d.getFullYear() * 12 + d.getMonth();

    if (i === 0) {
      // Initial lump sum
      if (initialInvestment > 0) {
        shares += initialInvestment / close;
        totalInvested += initialInvestment;
      }
      lastMonth = month;
    } else if (month !== lastMonth) {
      // New month: DCA contribution
      if (monthlyContribution > 0) {
        shares += monthlyContribution / close;
        totalInvested += monthlyContribution;
      }

      // Monthly dividend reinvestment
      if (dividendYield > 0) {
        const monthlyYield = dividendYield / 12;
        const currentValue = shares * close;
        const divAmount = currentValue * monthlyYield;
        dividendIncome += divAmount;
        if (reinvestDividends) {
          shares += divAmount / close;
        }
      }

      lastMonth = month;
    }

    const value = shares * close;
    series.push({ date, value, costBasis: totalInvested });
    portfolioValues.push(value);
  }

  const finalValue = series.length > 0 ? series[series.length - 1].value : 0;
  const totalReturnPct =
    totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;

  const startDate = new Date(prices[0].date);
  const endDate = new Date(prices[prices.length - 1].date);
  const years = (endDate.getTime() - startDate.getTime()) / (365.25 * 86400000);

  const cagr = totalInvested > 0 ? calculateCAGR(totalInvested, finalValue, years) : 0;
  const maxDrawdownPct = calculateMaxDrawdown(portfolioValues);

  const dailyReturns = computeDailyReturns(portfolioValues);
  const sharpeRatio = calculateSharpeRatio(dailyReturns, 4.0);

  const yearlyReturns = computeYearlyReturns(series);
  const bestYear =
    yearlyReturns.length > 0
      ? yearlyReturns.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
      : null;
  const worstYear =
    yearlyReturns.length > 0
      ? yearlyReturns.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
      : null;

  return {
    series,
    totalInvested,
    finalValue,
    totalReturnPct,
    cagr,
    maxDrawdownPct,
    sharpeRatio,
    dividendIncome,
    bestYear,
    worstYear,
    yearlyReturns,
  };
}

/* ── Yearly Returns ───────────────────────────────────────── */

function computeYearlyReturns(series: BacktestPoint[]): BacktestYearReturn[] {
  if (series.length < 2) return [];

  const byYear = new Map<number, { first: number; last: number }>();
  for (const pt of series) {
    const year = new Date(pt.date).getFullYear();
    const entry = byYear.get(year);
    if (!entry) {
      byYear.set(year, { first: pt.value, last: pt.value });
    } else {
      entry.last = pt.value;
    }
  }

  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]);
  const results: BacktestYearReturn[] = [];

  for (let i = 0; i < years.length; i++) {
    const [year, { last }] = years[i];
    const startValue = i === 0 ? years[0][1].first : years[i - 1][1].last;
    if (startValue > 0) {
      results.push({
        year,
        returnPct: ((last - startValue) / startValue) * 100,
      });
    }
  }

  return results;
}

/* ── Normalize Series (base-100 index) ────────────────────── */

export function normalizeSeries(values: number[]): number[] {
  if (values.length === 0) return [];
  const first = values[0];
  if (!first || first <= 0) return values.map(() => 0);
  return values.map((v) => (v / first) * 100);
}

/* ── Stress Test Helpers ──────────────────────────────────── */

export interface StressHoldingImpact {
  ticker: string;
  name: string;
  sector: string;
  currentValue: number;
  drawdownPct: number;
  simulatedLoss: number;
  crisisValue: number;
}

export interface StressTestResult {
  portfolioDrawdownPct: number;
  dollarLoss: number;
  holdingImpacts: StressHoldingImpact[];
  worstSector: string | null;
  bestSector: string | null;
  estimatedRecoveryYears: number;
  resilienceScore: number;
}

/**
 * Apply sector-level drawdowns to a set of holdings.
 */
export function computeStressTest(
  holdings: { ticker: string; name: string; sector: string; currentValue: number }[],
  sectorDrawdowns: Record<string, number>,
  defaultDrawdown: number = 0.40,
  benchmarkRecoveryYears: number = 4
): StressTestResult {
  let totalValue = 0;
  let totalCrisisValue = 0;

  const holdingImpacts: StressHoldingImpact[] = [];
  const sectorLosses = new Map<string, { loss: number; value: number }>();

  for (const h of holdings) {
    const dd = sectorDrawdowns[h.sector] ?? defaultDrawdown;
    const loss = h.currentValue * dd;
    const crisisValue = h.currentValue - loss;

    holdingImpacts.push({
      ticker: h.ticker,
      name: h.name,
      sector: h.sector,
      currentValue: h.currentValue,
      drawdownPct: dd * 100,
      simulatedLoss: loss,
      crisisValue,
    });

    totalValue += h.currentValue;
    totalCrisisValue += crisisValue;

    const entry = sectorLosses.get(h.sector) || { loss: 0, value: 0 };
    entry.loss += loss;
    entry.value += h.currentValue;
    sectorLosses.set(h.sector, entry);
  }

  const portfolioDrawdownPct =
    totalValue > 0 ? ((totalValue - totalCrisisValue) / totalValue) * 100 : 0;

  let worstSector: string | null = null;
  let bestSector: string | null = null;
  let worstPct = 0;
  let bestPct = 100;

  for (const [sector, { loss, value }] of sectorLosses) {
    const pct = value > 0 ? (loss / value) * 100 : 0;
    if (pct >= worstPct) {
      worstPct = pct;
      worstSector = sector;
    }
    if (pct <= bestPct) {
      bestPct = pct;
      bestSector = sector;
    }
  }

  // Resilience: 10 = fully diversified/low drawdown, 0 = concentrated/high drawdown
  const uniqueSectors = sectorLosses.size;
  const diversificationScore = Math.min(uniqueSectors / 8, 1); // 8+ sectors = max
  const drawdownScore = 1 - Math.min(portfolioDrawdownPct / 60, 1); // <60% = some score
  const resilienceScore = Math.round((diversificationScore * 4 + drawdownScore * 6) * 10) / 10;

  // Estimated recovery: scale benchmark recovery by portfolio's relative drawdown
  const estimatedRecoveryYears =
    Math.round((benchmarkRecoveryYears * (portfolioDrawdownPct / 50)) * 10) / 10;

  return {
    portfolioDrawdownPct,
    dollarLoss: totalValue - totalCrisisValue,
    holdingImpacts,
    worstSector,
    bestSector,
    estimatedRecoveryYears,
    resilienceScore,
  };
}
