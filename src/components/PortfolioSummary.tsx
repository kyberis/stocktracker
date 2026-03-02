"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";

export default function PortfolioSummary() {
  const { holdings, quotes, exchangeRates, isLoading } = usePortfolio();
  const { t } = useI18n();
  const {
    totalCurrentEUR,
    totalCostEUR,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLossEUR,
  } = calculatePortfolioTotals(holdings, quotes, exchangeRates);

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
      label: t("totalGainLossSinceStart"),
      value: formatCurrency(totalGainLoss, "EUR"),
      subValue: formatPercent(totalGainLossPercent),
      color: totalGainLoss >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: t("dayGainLoss"),
      value: formatCurrency(dayGainLossEUR, "EUR"),
      color: dayGainLossEUR >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: t("holdings"),
      value: holdings.length.toString(),
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
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
