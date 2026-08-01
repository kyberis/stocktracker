import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, ManualAssetType, QuoteData } from "./types";
import { convertCurrency, convertToEUR, resolveQuoteCurrency } from "./utils";

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
      const currentBase = convertCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" && h.valueInEUR > 0 && referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      } else if (currentBase !== valueInQuoteCurrency || quoteCurrency === baseCurrency) {
        valueBase = currentBase;
      } else {
        valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      }
    } else {
      valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }

    buckets[type] = (buckets[type] || 0) + valueBase;
  }

  for (const c of cashEntries) {
    const assetType: ManualAssetType = c.type ?? "cash";
    const valueBase = convertCurrency(c.amountEUR, "EUR", baseCurrency, exchangeRates);
    buckets[assetType] = (buckets[assetType] || 0) + valueBase;
  }

  const grandTotal = Object.values(buckets).reduce((s, v) => s + v, 0);

  const order: AllocationKey[] = ["stock", "etf", "fund", "crypto", "real_estate", "savings", "pension", "cash"];
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
      const currentBase = convertCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" && h.valueInEUR > 0 && referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      } else if (currentBase !== valueInQuoteCurrency || quoteCurrency === baseCurrency) {
        valueBase = currentBase;
      } else {
        valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      }
    } else {
      valueBase = convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
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
    const costBase = convertCurrency(costInDisplayCurrency, h.displayCurrency, baseCurrency, exchangeRates);

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentBase = convertCurrency(valueInQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);
      const dayDeltaQuoteCurrency = h.shares * (quote.regularMarketChange ?? 0);
      const dayDeltaBase = convertCurrency(dayDeltaQuoteCurrency, quoteCurrency, baseCurrency, exchangeRates);

      const referenceEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" &&
        h.valueInEUR > 0 &&
        referenceEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        totalCurrentBase += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      } else if (currentBase !== valueInQuoteCurrency || quoteCurrency === baseCurrency) {
        totalCurrentBase += currentBase;
      } else {
        totalCurrentBase += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      }
      dayGainLossBase += dayDeltaBase;
    } else {
      totalCurrentBase += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }

    if (costBase !== costInDisplayCurrency || h.displayCurrency === baseCurrency) {
      totalCostBase += costBase;
    } else {
      totalCostBase += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
    }
  });

  for (const cash of cashEntries) {
    const cashBase = convertCurrency(cash.amountEUR, "EUR", baseCurrency, exchangeRates);
    totalCurrentBase += cashBase;
    totalCostBase += cashBase;
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
