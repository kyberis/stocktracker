"use client";

import { useMemo } from "react";
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

  const summaryCards = useMemo(() => [
    {
      label: t("totalValue"),
      value: formatCurrency(totalCurrentEUR, "EUR"),
      color: "text-gray-900 dark:text-white",
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: t("totalCost"),
      value: formatCurrency(totalCostEUR, "EUR"),
      color: "text-gray-700 dark:text-slate-200",
      iconBg: "bg-gray-50 dark:bg-slate-700",
      iconColor: "text-gray-400 dark:text-slate-500",
    },
    {
      label: t("totalGainLossSinceStart"),
      value: formatCurrency(totalGainLoss, "EUR"),
      subValue: formatPercent(totalGainLossPercent),
      color: totalGainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
      iconBg: totalGainLoss >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10",
      iconColor: totalGainLoss >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: t("dayGainLoss"),
      value: formatCurrency(dayGainLossEUR, "EUR"),
      color: dayGainLossEUR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
      iconBg: dayGainLossEUR >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10",
      iconColor: dayGainLossEUR >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: t("holdings"),
      value: (holdings.length + cashEntries.length).toString(),
      color: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
      iconColor: "text-indigo-500",
    },
  ], [t, totalCurrentEUR, totalCostEUR, totalGainLoss, totalGainLossPercent, dayGainLossEUR, holdings.length, cashEntries.length]);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      {summaryCards.map((card) => (
        <div key={card.label} className="card">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{card.label}</p>
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
