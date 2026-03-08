"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, formatStealthCurrency } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { useStealthMode } from "@/lib/stealth-context";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PortfolioSummary({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, isLoading } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const {
    totalCurrentEUR,
    totalCostEUR,
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
          <div>
            <p
              className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ${isLoading ? "animate-pulse" : ""}`}
              aria-label={stealthMode ? formatCurrency(totalCurrentEUR, "EUR") : undefined}
            >
              {formatStealthCurrency(totalCurrentEUR, "EUR", stealthMode)}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t("cost")}: <span aria-label={stealthMode ? formatCurrency(totalCostEUR, "EUR") : undefined}>{formatStealthCurrency(totalCostEUR, "EUR", stealthMode)}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
              dayIsPositive
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
            }`}
            aria-label={stealthMode ? `${formatCurrency(dayGainLossEUR, "EUR")} (${formatPercent(dayPercent)})` : undefined}
          >
            {stealthMode ? "•••••" : `${dayIsPositive ? "+" : ""}${formatCurrency(dayGainLossEUR, "EUR")} (${formatPercent(dayPercent)})`}
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
