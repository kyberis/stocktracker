import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, ManualAssetType, QuoteData } from "./types";
import {
  canConvertCurrency,
  convertCurrency,
  convertToEUR,
  resolveQuoteCurrency,
  todayLocal,
} from "./utils";

/** Convert to base currency, or null when FX is missing (never inflate with raw foreign). */
function toBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  rates: ExchangeRates,
): number | null {
  if (!canConvertCurrency(fromCurrency, baseCurrency, rates)) return null;
  const v = convertCurrency(amount, fromCurrency, baseCurrency, rates);
  return Number.isFinite(v) ? v : null;
}
import {
  cashAmountEUR,
  dayChangeFixedReturnCash,
  fixedReturnPrincipalEUR,
  isFixedReturnCashEntry,
} from "./fixed-return-cash";

export interface AllocationSlice {
  key: string;
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

type AllocationKey = HoldingAssetType | ManualAssetType;

const ALLOCATION_COLORS: Record<AllocationKey, string> = {
  stock: "#6366f1",
  etf: "#10b981",
  fund: "#14b8a6",
  crypto: "#f59e0b",
  real_estate: "#3b82f6",
  savings: "#06b6d4",
  pension: "#8b5cf6",
  fixed_return: "#0ea5e9",
  cash: "#1e293b",
};

const ALLOCATION_LABELS: Record<AllocationKey, string> = {
  stock: "Stocks",
  etf: "ETFs",
  fund: "Funds",
  crypto: "Crypto",
  real_estate: "Real Estate",
  savings: "Savings",
  pension: "Pension",
  fixed_return: "Fixed return",
  cash: "Cash",
};

export function computeAllocationByType(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): AllocationSlice[] {
  const buckets: Record<string, number> = {};

  for (const h of holdings) {
    const type: HoldingAssetType = h.assetType ?? "stock";
    const quote = quotes[h.ticker];
    let valueBase = 0;

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentBase = toBaseCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" &&
        h.valueInEUR > 0 &&
        Number.isFinite(referenceEUR) &&
        referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      } else if (currentBase != null) {
        valueBase = currentBase;
      } else {
        valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      }
    } else {
      valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    }

    buckets[type] = (buckets[type] || 0) + valueBase;
  }

  for (const c of cashEntries) {
    const assetType: ManualAssetType = c.type ?? "cash";
    const amountEUR = cashAmountEUR(c, { rates: exchangeRates });
    const valueBase = convertCurrency(amountEUR, "EUR", baseCurrency, exchangeRates);
    buckets[assetType] = (buckets[assetType] || 0) + valueBase;
  }

  const grandTotal = Object.values(buckets).reduce((s, v) => s + v, 0);

  const order: AllocationKey[] = ["stock", "etf", "fund", "crypto", "fixed_return", "real_estate", "savings", "pension", "cash"];
  return order
    .filter((key) => (buckets[key] ?? 0) > 0)
    .map((key) => ({
      key,
      label: ALLOCATION_LABELS[key],
      valueEUR: buckets[key],
      percent: grandTotal > 0 ? (buckets[key] / grandTotal) * 100 : 0,
      color: ALLOCATION_COLORS[key],
    }));
}

/**
 * Bucket current holding values by asset type — used by live snapshot writers
 * and the client-side breakdown cards. Returns EUR-equivalent values per type.
 */
export function computeValueByAssetType(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): Record<HoldingAssetType, number> {
  const buckets: Record<HoldingAssetType, number> = { stock: 0, etf: 0, fund: 0, crypto: 0 };

  for (const h of holdings) {
    const type: HoldingAssetType = h.assetType ?? "stock";
    const quote = quotes[h.ticker];
    let valueBase = 0;

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentBase = toBaseCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" &&
        h.valueInEUR > 0 &&
        Number.isFinite(referenceEUR) &&
        referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      } else if (currentBase != null) {
        valueBase = currentBase;
      } else {
        valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      }
    } else {
      valueBase = toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    }

    buckets[type] += valueBase;
  }

  return buckets;
}

export interface AssetTypeTotals {
  stock: PortfolioTotals;
  etf: PortfolioTotals;
  fund: PortfolioTotals;
  crypto: PortfolioTotals;
  allocations: Record<HoldingAssetType, number>;
}

/**
 * Compute PortfolioTotals for each asset type independently.
 * Used by breakdown cards and the hero chart filter.
 */
export function calculateTotalsByAssetType(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR",
): AssetTypeTotals {
  const groups: Record<HoldingAssetType, Holding[]> = { stock: [], etf: [], fund: [], crypto: [] };
  for (const h of holdings) {
    const type: HoldingAssetType = h.assetType ?? "stock";
    groups[type].push(h);
  }

  const emptyCash: CashEntry[] = [];
  const stock = calculatePortfolioTotals(groups.stock, emptyCash, quotes, exchangeRates, baseCurrency);
  const etf = calculatePortfolioTotals(groups.etf, emptyCash, quotes, exchangeRates, baseCurrency);
  const fund = calculatePortfolioTotals(groups.fund, emptyCash, quotes, exchangeRates, baseCurrency);
  const crypto = calculatePortfolioTotals(groups.crypto, emptyCash, quotes, exchangeRates, baseCurrency);

  const allTotals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const total = allTotals.totalCurrentEUR;

  const allocations: Record<HoldingAssetType, number> = {
    stock: total > 0 ? (stock.totalCurrentEUR / total) * 100 : 0,
    etf: total > 0 ? (etf.totalCurrentEUR / total) * 100 : 0,
    fund: total > 0 ? (fund.totalCurrentEUR / total) * 100 : 0,
    crypto: total > 0 ? (crypto.totalCurrentEUR / total) * 100 : 0,
  };

  return { stock, etf, fund, crypto, allocations };
}

export interface PortfolioTotals {
  totalCurrentEUR: number;
  totalCostEUR: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLossEUR: number;
}

export function calculatePortfolioTotals(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string = "EUR"
): PortfolioTotals {
  let totalCurrentBase = 0;
  let totalCostBase = 0;
  let dayGainLossBase = 0;

  holdings.forEach((h) => {
    const quote = quotes[h.ticker];

    const costInDisplayCurrency = h.shares * h.purchasePrice;
    const costBase = toBaseCurrency(costInDisplayCurrency, h.displayCurrency, baseCurrency, exchangeRates);

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentBase = toBaseCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const dayDeltaQuoteCurrency = h.shares * (quote.regularMarketChange ?? 0);
      const dayDeltaBase = toBaseCurrency(dayDeltaQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);

      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" &&
        h.valueInEUR > 0 &&
        Number.isFinite(referenceEUR) &&
        referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        totalCurrentBase += toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      } else if (currentBase != null) {
        totalCurrentBase += currentBase;
      } else {
        totalCurrentBase += toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      }
      dayGainLossBase += dayDeltaBase ?? 0;
    } else {
      totalCurrentBase += toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    }

    if (costBase != null) {
      totalCostBase += costBase;
    } else {
      totalCostBase += toBaseCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    }
  });

  const asOf = todayLocal();
  for (const cash of cashEntries) {
    const amountEUR = cashAmountEUR(cash, { asOf, rates: exchangeRates });
    const cashBase = toBaseCurrency(amountEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    totalCurrentBase += cashBase;
    if (isFixedReturnCashEntry(cash)) {
      const principalEUR = fixedReturnPrincipalEUR(cash, exchangeRates);
      totalCostBase += toBaseCurrency(principalEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
      const dayDeltaEUR = dayChangeFixedReturnCash(cash, asOf, exchangeRates);
      dayGainLossBase += toBaseCurrency(dayDeltaEUR, "EUR", baseCurrency, exchangeRates) ?? 0;
    } else {
      totalCostBase += cashBase;
    }
  }

  const totalGainLoss = totalCurrentBase - totalCostBase;
  const totalGainLossPercent = totalCostBase > 0 ? (totalGainLoss / totalCostBase) * 100 : 0;

  return {
    totalCurrentEUR: totalCurrentBase,
    totalCostEUR: totalCostBase,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLossEUR: dayGainLossBase,
  };
}
