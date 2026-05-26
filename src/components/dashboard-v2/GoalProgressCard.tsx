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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">{t("v2MyGoal")}</p>
        <span className="text-sm font-bold tabular-nums text-emerald-400">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-emerald-500/14 bg-emerald-500/12 text-sm">
          🎯
        </div>
        <p className="flex-1 text-[10px] text-[color:var(--muted)]">
          {stealthMode
            ? "••••• / •••••"
            : `${formatCurrency(totals.totalCurrentEUR, cur)} / ${formatCurrency(goal.targetAmount, cur)}`}
        </p>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[color:var(--surface-highlight)]">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
