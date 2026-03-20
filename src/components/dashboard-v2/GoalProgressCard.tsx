"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency } from "@/lib/utils";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

export default function GoalProgressCard({ holdings, cashEntries }: Props) {
  const { t } = useI18n();
  const { goal, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  if (!goal || !goal.targetAmount || goal.targetAmount <= 0) return null;

  const pct = Math.min((totals.totalCurrentEUR / goal.targetAmount) * 100, 100);
  const cur = activePortfolioCurrency;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("v2MyGoal")}</p>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-sm shrink-0">
          🎯
        </div>
        <p className="text-[10px] text-gray-500 dark:text-slate-500 flex-1">
          {stealthMode
            ? "••••• / •••••"
            : `${formatCurrency(totals.totalCurrentEUR, cur)} / ${formatCurrency(goal.targetAmount, cur)}`}
        </p>
      </div>
      <div className="h-[3px] mt-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
