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
    dayGainLossEUR,
    totalGainLoss,
    totalGainLossPercent,
  } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);

  const dayIsPositive = dayGainLossEUR >= 0;
  const dayPercent = totalCurrentEUR > 0
    ? (dayGainLossEUR / (totalCurrentEUR - dayGainLossEUR)) * 100
    : 0;

  const totalIsPositive = totalGainLoss >= 0;
  const holdingsCount = holdings.length + cashEntries.length;

  return (
    <div className="card px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <p className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ${isLoading ? "animate-pulse" : ""}`}>
            {formatCurrency(totalCurrentEUR, "EUR")}
          </p>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
              dayIsPositive
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
            }`}
          >
            {dayIsPositive ? "+" : ""}{formatCurrency(dayGainLossEUR, "EUR")} ({formatPercent(dayPercent)})
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
          <span className={`font-medium ${totalIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {formatPercent(totalGainLossPercent)} {t("totalGainLoss").toLowerCase()}
          </span>
          <span className="text-gray-300 dark:text-slate-600">·</span>
          <span>{holdingsCount} {t("holdings").toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}
