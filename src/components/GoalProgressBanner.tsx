"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function GoalProgressBanner({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const track = useTrack();
  const {
    holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates,
    activePortfolioCurrency, goal, goals,
  } = usePortfolio();
  const additionalGoals = goals.length > 1 ? goals.length - 1 : 0;
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency]
  );

  const progress = useMemo(() => {
    if (!goal || goal.targetAmount <= 0) return 0;
    return Math.min(100, (totals.totalCurrentEUR / goal.targetAmount) * 100);
  }, [goal, totals.totalCurrentEUR]);

  const timeToGoal = useMemo(() => {
    if (!goal || goal.targetAmount <= 0 || totals.totalCurrentEUR >= goal.targetAmount) return null;
    const rate = goal.growthRate / 100;
    if (rate <= 0) return null;
    let value = totals.totalCurrentEUR;
    const yearly = goal.yearlyContribution;
    const maxYears = Math.max(goal.horizon, 200);
    for (let y = 1; y <= maxYears; y++) {
      value = value * (1 + rate) + yearly;
      if (value >= goal.targetAmount) {
        const prev = (value - yearly) / (1 + rate);
        const fraction = prev < goal.targetAmount ? (goal.targetAmount - prev) / (value - prev) : 0;
        const exact = (y - 1) + fraction;
        return { years: Math.floor(exact), months: Math.round((exact - Math.floor(exact)) * 12) };
      }
    }
    return null;
  }, [goal, totals.totalCurrentEUR]);

  if (!goal || goal.targetAmount <= 0) return null;

  const isReached = progress >= 100;

  return (
    <button
      onClick={() => { track("goal_banner_clicked", { progress: progress.toFixed(0) }); document.getElementById("goal-planner")?.scrollIntoView({ behavior: "smooth" }); }}
      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50/50 to-amber-50/30 dark:from-emerald-500/5 dark:to-amber-500/5 p-3.5 flex items-center gap-3.5 text-left hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-base shrink-0">
        {isReached ? "🏆" : "🎯"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
            {goal.name}
            {additionalGoals > 0 && (
              <a href="/tools/planning" className="ml-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                +{additionalGoals} more
              </a>
            )}
          </span>
          <span className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500 dark:text-slate-400">
          <span>
            {formatCurrency(totals.totalCurrentEUR, baseCurrency)} {t("goalBannerOf")} {formatCurrency(goal.targetAmount, baseCurrency)}
          </span>
          <span>
            {isReached
              ? t("goalBannerReached")
              : timeToGoal
                ? t("goalBannerRemaining").replace("{years}", String(timeToGoal.years)).replace("{months}", String(timeToGoal.months))
                : ""}
          </span>
        </div>
      </div>
      <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
