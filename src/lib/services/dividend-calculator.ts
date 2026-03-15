import type { ExchangeRates, Holding, QuoteData, Transaction } from "@/lib/types";
import { convertToEUR } from "@/lib/utils";

const DEFAULT_GROWTH_RATE = 0.10;
const DEFAULT_PROJECTION_YEARS = 5;
const DEFAULT_DRIP_GROWTH_RATE = 0.05;
const DEFAULT_DRIP_YEARS = 10;

export interface EstimatedDividend {
  ticker: string;
  name: string;
  shares: number;
  annualDividendPerShare: number;
  dividendYield: number;
  yieldOnCost: number;
  annualIncome: number;
  currency: string;
  annualIncomeEUR: number;
}

export interface DripProjectionRow {
  year: number;
  withoutDrip: number;
  withDrip: number;
}

export interface YearlyDividend {
  year: number;
  amount: number;
}

export interface ProjectionRow {
  year: number;
  amount: number;
  isProjection: boolean;
}

export interface MonthlyIncome {
  month: string;
  dividends: number;
  gains: number;
  total: number;
}

export function filterDividendTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((tx) => tx.type === "dividend");
}

export function filterSellTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((tx) => tx.type === "sell");
}

export function sumTransactionAmounts(txs: Transaction[]): number {
  return txs.reduce((s, tx) => s + tx.totalAmount, 0);
}

export function sumAnnualDividends(dividendTxs: Transaction[], year: number): number {
  return dividendTxs
    .filter((tx) => tx.date.startsWith(String(year)))
    .reduce((s, tx) => s + tx.totalAmount, 0);
}

export function computePortfolioValueFromQuotes(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
): number {
  return holdings.reduce((s, h) => {
    const q = quotes[h.ticker];
    return s + (q ? h.shares * q.regularMarketPrice : 0);
  }, 0);
}

export function computeEstimatedDividends(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): EstimatedDividend[] {
  const items: EstimatedDividend[] = [];
  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (!q) continue;
    const rate = q.trailingAnnualDividendRate;
    if (!rate || rate <= 0) continue;
    const yld = q.trailingAnnualDividendYield ?? 0;
    const annualIncome = h.shares * rate;
    const cur = q.currency || h.displayCurrency || "USD";
    const annualIncomeEUR = convertToEUR(annualIncome, cur, exchangeRates);
    const yoc = h.purchasePrice > 0 ? (rate / h.purchasePrice) * 100 : 0;
    items.push({
      ticker: h.ticker,
      name: h.name,
      shares: h.shares,
      annualDividendPerShare: rate,
      dividendYield: yld * 100,
      yieldOnCost: yoc,
      annualIncome,
      currency: cur,
      annualIncomeEUR,
    });
  }
  items.sort((a, b) => b.annualIncomeEUR - a.annualIncomeEUR);
  return items;
}

export function computeTotalEstimatedEUR(estimated: EstimatedDividend[]): number {
  return estimated.reduce((s, e) => s + e.annualIncomeEUR, 0);
}

export function computeEstimatedYield(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  totalEstimatedEUR: number,
): number {
  const totalValue = holdings.reduce((s, h) => {
    const q = quotes[h.ticker];
    if (!q) return s;
    const cur = q.currency || h.displayCurrency || "USD";
    const valueEUR = convertToEUR(h.shares * q.regularMarketPrice, cur, exchangeRates);
    return s + valueEUR;
  }, 0);
  return totalValue > 0 ? (totalEstimatedEUR / totalValue) * 100 : 0;
}

export function computeYearlyBreakdown(dividendTxs: Transaction[]): YearlyDividend[] {
  const map: Record<number, number> = {};
  dividendTxs.forEach((tx) => {
    const y = parseInt(tx.date.slice(0, 4), 10);
    if (!isNaN(y)) map[y] = (map[y] || 0) + tx.totalAmount;
  });
  return Object.entries(map)
    .map(([y, amt]) => ({ year: Number(y), amount: amt }))
    .sort((a, b) => a.year - b.year);
}

export function computeMonthlyCalendar(
  dividendTxs: Transaction[],
  limit = 12,
): Array<[string, number]> {
  const map: Record<string, number> = {};
  dividendTxs.forEach((tx) => {
    const key = tx.date.slice(0, 7);
    map[key] = (map[key] || 0) + tx.totalAmount;
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, limit);
}

export function computeTopPayers(
  dividendTxs: Transaction[],
  limit = 8,
): Array<[string, number]> {
  const map: Record<string, number> = {};
  dividendTxs.forEach((tx) => {
    map[tx.ticker] = (map[tx.ticker] || 0) + tx.totalAmount;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function computeDividendProjections(
  byYear: YearlyDividend[],
  thisYear: number,
  thisMonth: number,
  growthRate = DEFAULT_GROWTH_RATE,
  projectionYears = DEFAULT_PROJECTION_YEARS,
): ProjectionRow[] {
  let base: number;
  const currentYearData = byYear.find((y) => y.year === thisYear);
  const lastFullYear = byYear.filter((y) => y.year < thisYear).pop();

  if (lastFullYear && lastFullYear.amount > 0) {
    base = lastFullYear.amount;
  } else if (currentYearData && currentYearData.amount > 0) {
    base = (currentYearData.amount / thisMonth) * 12;
  } else {
    base = 0;
  }

  const rows: ProjectionRow[] = [];
  byYear.forEach((y) => rows.push({ year: y.year, amount: y.amount, isProjection: false }));

  if (base > 0) {
    let projected = lastFullYear ? lastFullYear.amount : base;
    if (currentYearData) {
      projected = currentYearData.amount > projected ? currentYearData.amount : projected;
    }
    for (let i = 1; i <= projectionYears; i++) {
      projected = projected * (1 + growthRate);
      rows.push({ year: thisYear + i, amount: projected, isProjection: true });
    }
  }

  return rows;
}

export function computeEstimatedProjections(
  hasDividendTxs: boolean,
  totalEstimatedEUR: number,
  thisYear: number,
  growthRate = DEFAULT_GROWTH_RATE,
  projectionYears = DEFAULT_PROJECTION_YEARS,
): ProjectionRow[] {
  if (hasDividendTxs || totalEstimatedEUR <= 0) return [];
  const rows: ProjectionRow[] = [];
  rows.push({ year: thisYear, amount: totalEstimatedEUR, isProjection: false });
  let projected = totalEstimatedEUR;
  for (let i = 1; i <= projectionYears; i++) {
    projected = projected * (1 + growthRate);
    rows.push({ year: thisYear + i, amount: projected, isProjection: true });
  }
  return rows;
}

export function computeIncomeByMonth(
  dividendTxs: Transaction[],
  sellTxs: Transaction[],
  exchangeRates: ExchangeRates,
  now = new Date(),
): MonthlyIncome[] {
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const divByMonth: Record<string, number> = {};
  const gainByMonth: Record<string, number> = {};
  months.forEach((m) => { divByMonth[m] = 0; gainByMonth[m] = 0; });

  dividendTxs.forEach((tx) => {
    const key = tx.date.slice(0, 7);
    if (key in divByMonth) {
      const net = tx.totalAmount - (tx.taxes || 0);
      divByMonth[key] += tx.exchangeRateEur
        ? net * tx.exchangeRateEur
        : convertToEUR(net, tx.currency || "EUR", exchangeRates);
    }
  });

  sellTxs.forEach((tx) => {
    const key = tx.date.slice(0, 7);
    if (key in gainByMonth) {
      const proceeds = tx.exchangeRateEur
        ? tx.totalAmount * tx.exchangeRateEur
        : convertToEUR(tx.totalAmount, tx.currency || "EUR", exchangeRates);
      gainByMonth[key] += proceeds;
    }
  });

  return months.map((m) => ({
    month: m,
    dividends: divByMonth[m],
    gains: gainByMonth[m],
    total: divByMonth[m] + gainByMonth[m],
  }));
}

export function computePortfolioYieldOnCost(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): number {
  let totalCostEUR = 0;
  let totalAnnualDivEUR = 0;

  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (!q) continue;
    const rate = q.trailingAnnualDividendRate;
    if (!rate || rate <= 0 || h.purchasePrice <= 0) continue;
    const cur = q.currency || h.displayCurrency || "USD";
    totalAnnualDivEUR += convertToEUR(h.shares * rate, cur, exchangeRates);
    totalCostEUR += convertToEUR(h.shares * h.purchasePrice, cur, exchangeRates);
  }

  return totalCostEUR > 0 ? (totalAnnualDivEUR / totalCostEUR) * 100 : 0;
}

/**
 * Projects dividend income with and without DRIP over a given horizon.
 * Per-holding: each year, reinvested dividends buy fractional shares at
 * today's price, which then earn additional dividends.
 */
export function computeDripSimulation(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  growthRate = DEFAULT_DRIP_GROWTH_RATE,
  years = DEFAULT_DRIP_YEARS,
): DripProjectionRow[] {
  interface HoldingState {
    shares: number;
    dps: number;
    price: number;
    currency: string;
  }

  const holdingStates: HoldingState[] = [];
  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (!q) continue;
    const rate = q.trailingAnnualDividendRate;
    if (!rate || rate <= 0 || q.regularMarketPrice <= 0) continue;
    holdingStates.push({
      shares: h.shares,
      dps: rate,
      price: q.regularMarketPrice,
      currency: q.currency || h.displayCurrency || "USD",
    });
  }

  if (holdingStates.length === 0) return [];

  const dripStates = holdingStates.map((s) => ({ ...s }));

  const rows: DripProjectionRow[] = [];
  for (let y = 0; y <= years; y++) {
    const growthMultiplier = Math.pow(1 + growthRate, y);

    let withoutDrip = 0;
    let withDrip = 0;

    for (let i = 0; i < holdingStates.length; i++) {
      const base = holdingStates[i];
      const drip = dripStates[i];
      const dpsThisYear = base.dps * growthMultiplier;

      withoutDrip += convertToEUR(base.shares * dpsThisYear, base.currency, exchangeRates);
      withDrip += convertToEUR(drip.shares * dpsThisYear, drip.currency, exchangeRates);

      if (y < years) {
        const dripDividend = drip.shares * dpsThisYear;
        drip.shares += dripDividend / drip.price;
      }
    }

    rows.push({ year: y, withoutDrip, withDrip });
  }

  return rows;
}
