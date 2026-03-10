import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, QuoteData } from "./types";
import { convertToEUR, resolveQuoteCurrency } from "./utils";

export interface AllocationSlice {
  key: string;
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

const ALLOCATION_COLORS: Record<HoldingAssetType | "cash", string> = {
  stock: "#6366f1",
  etf: "#10b981",
  crypto: "#f59e0b",
  cash: "#1e293b",
};

const ALLOCATION_LABELS: Record<HoldingAssetType | "cash", string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  cash: "Cash",
};

export function computeAllocationByType(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): AllocationSlice[] {
  const buckets: Record<string, number> = {};

  for (const h of holdings) {
    const type: HoldingAssetType = h.assetType ?? "stock";
    const quote = quotes[h.ticker];
    let valueEUR = 0;

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" && h.valueInEUR > 0 && currentEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        valueEUR = h.valueInEUR;
      } else if (currentEUR !== valueInQuoteCurrency || quoteCurrency === "EUR") {
        valueEUR = currentEUR;
      } else {
        valueEUR = h.valueInEUR;
      }
    } else {
      valueEUR = h.valueInEUR;
    }

    buckets[type] = (buckets[type] || 0) + valueEUR;
  }

  let cashTotal = 0;
  for (const c of cashEntries) {
    cashTotal += c.amountEUR;
  }
  if (cashTotal > 0) {
    buckets["cash"] = cashTotal;
  }

  const grandTotal = Object.values(buckets).reduce((s, v) => s + v, 0);

  const order: (HoldingAssetType | "cash")[] = ["stock", "etf", "crypto", "cash"];
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
  exchangeRates: ExchangeRates
): PortfolioTotals {
  let totalCurrentEUR = 0;
  let totalCostEUR = 0;
  let dayGainLossEUR = 0;

  holdings.forEach((h) => {
    const quote = quotes[h.ticker];

    const costInDisplayCurrency = h.shares * h.purchasePrice;
    const costEUR = convertToEUR(costInDisplayCurrency, h.displayCurrency, exchangeRates);

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);
      const dayDeltaQuoteCurrency = h.shares * (quote.regularMarketChange ?? 0);
      const dayDeltaEUR = convertToEUR(dayDeltaQuoteCurrency, quoteCurrency, exchangeRates);
      const isSuspiciousGBXOutlier =
        h.displayCurrency === "GBX" &&
        h.valueInEUR > 0 &&
        currentEUR > h.valueInEUR * 10;

      if (isSuspiciousGBXOutlier) {
        totalCurrentEUR += h.valueInEUR;
      } else if (currentEUR !== valueInQuoteCurrency || quoteCurrency === "EUR") {
        totalCurrentEUR += currentEUR;
      } else {
        totalCurrentEUR += h.valueInEUR;
      }
      dayGainLossEUR += dayDeltaEUR;
    } else {
      totalCurrentEUR += h.valueInEUR;
    }

    if (costEUR !== costInDisplayCurrency || h.displayCurrency === "EUR") {
      totalCostEUR += costEUR;
    } else {
      totalCostEUR += h.valueInEUR;
    }
  });

  for (const cash of cashEntries) {
    totalCurrentEUR += cash.amountEUR;
    totalCostEUR += cash.amountEUR;
  }

  const totalGainLoss = totalCurrentEUR - totalCostEUR;
  const totalGainLossPercent = totalCostEUR > 0 ? (totalGainLoss / totalCostEUR) * 100 : 0;

  return {
    totalCurrentEUR,
    totalCostEUR,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLossEUR,
  };
}
