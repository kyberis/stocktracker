"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";

export default function PortfolioSummary() {
  const { holdings, cashEntries, quotes, exchangeRates, isLoading } = usePortfolio();
  const { t } = useI18n();
  const {
    totalCurrentEUR,
    totalCostEUR,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLossEUR,
  } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);

  const summaryCards = [
    {
      label: t("totalValue"),
      value: formatCurrency(totalCurrentEUR, "EUR"),
      color: "text-gray-900",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: t("totalCost"),
      value: formatCurrency(totalCostEUR, "EUR"),
      color: "text-gray-700",
      iconBg: "bg-gray-50",
      iconColor: "text-gray-400",
    },
    {
      label: t("totalGainLossSinceStart"),
      value: formatCurrency(totalGainLoss, "EUR"),
      subValue: formatPercent(totalGainLossPercent),
      color: totalGainLoss >= 0 ? "text-emerald-600" : "text-red-500",
      iconBg: totalGainLoss >= 0 ? "bg-emerald-50" : "bg-red-50",
      iconColor: totalGainLoss >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: t("dayGainLoss"),
      value: formatCurrency(dayGainLossEUR, "EUR"),
      color: dayGainLossEUR >= 0 ? "text-emerald-600" : "text-red-500",
      iconBg: dayGainLossEUR >= 0 ? "bg-emerald-50" : "bg-red-50",
      iconColor: dayGainLossEUR >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: t("holdings"),
      value: (holdings.length + cashEntries.length).toString(),
      color: "text-indigo-600",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      {summaryCards.map((card) => (
        <div key={card.label} className="card">
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
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
