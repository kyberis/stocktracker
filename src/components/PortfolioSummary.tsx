"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, convertToEUR, normalizeCurrency } from "@/lib/utils";

export default function PortfolioSummary() {
  const { holdings, quotes, exchangeRates, isLoading } = usePortfolio();
  const { t } = useI18n();

  let totalCurrentEUR = 0;
  let totalCostEUR = 0;

  holdings.forEach((h) => {
    const quote = quotes[h.ticker];

    const costInDisplayCurrency = h.shares * h.purchasePrice;
    const costEUR = convertToEUR(costInDisplayCurrency, h.displayCurrency, exchangeRates);

    if (quote && quote.regularMarketPrice > 0) {
      const quoteCurrency = normalizeCurrency(quote.currency);
      const valueInQuoteCurrency = h.shares * quote.regularMarketPrice;
      const currentEUR = convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates);

      if (currentEUR !== valueInQuoteCurrency || quoteCurrency === "EUR") {
        totalCurrentEUR += currentEUR;
      } else {
        totalCurrentEUR += h.valueInEUR;
      }
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

  const summaryCards = [
    {
      label: t("totalValue"),
      value: formatCurrency(totalCurrentEUR, "EUR"),
      color: "text-blue-400",
    },
    {
      label: t("totalCost"),
      value: formatCurrency(totalCostEUR, "EUR"),
      color: "text-slate-300",
    },
    {
      label: t("totalGainLoss"),
      value: formatCurrency(totalGainLoss, "EUR"),
      subValue: formatPercent(totalGainLossPercent),
      color: totalGainLoss >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: t("holdings"),
      value: holdings.length.toString(),
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card) => (
        <div key={card.label} className="card">
          <p className="text-sm text-slate-400 mb-1">{card.label}</p>
          <p className={`text-xl lg:text-2xl font-bold ${card.color} ${isLoading ? "animate-pulse" : ""}`}>
            {card.value}
          </p>
          {card.subValue && (
            <p className={`text-sm font-medium mt-0.5 ${card.color}`}>
              {card.subValue}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
