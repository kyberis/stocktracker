import type { ExchangeRates, Holding, QuoteData } from "./types";
import { convertToEUR, resolveQuoteCurrency } from "./utils";

export interface PortfolioTotals {
  totalCurrentEUR: number;
  totalCostEUR: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLossEUR: number;
}

export function calculatePortfolioTotals(
  holdings: Holding[],
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
