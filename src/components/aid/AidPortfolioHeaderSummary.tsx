"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { usePortfolioHomeData } from "@/components/dashboard-v2/use-portfolio-home-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CashEntry, Holding } from "@/lib/types";
import DayMoveAsOf from "@/components/DayMoveAsOf";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

export default function AidPortfolioHeaderSummary({ holdings, cashEntries }: Props) {
  const { t } = useI18n();
  const { activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const { totals, dayGainLoss, dayGainLossPercent } = usePortfolioHomeData({ holdings, cashEntries });

  const dayLabel = useMemo(() => {
    if (stealthMode) return { pct: "•••", abs: "" };
    const pct =
      dayGainLossPercent != null
        ? `${formatPercent(dayGainLossPercent)}`
        : null;
    const abs =
      dayGainLoss != null
        ? `${dayGainLoss >= 0 ? "+" : ""}${formatCurrency(dayGainLoss, activePortfolioCurrency)}`
        : "";
    return { pct: pct ?? "—", abs };
  }, [activePortfolioCurrency, dayGainLoss, dayGainLossPercent, stealthMode]);

  const isPositive = (dayGainLossPercent ?? dayGainLoss ?? 0) >= 0;

  const scrollToPortfolio = () => {
    document.getElementById("aid-portfolio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={scrollToPortfolio}
      className="group text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] rounded-md"
      aria-label={`${t("aidPortfolioValue")}: ${formatCurrency(totals.totalCurrentEUR, activePortfolioCurrency)}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)] group-hover:text-[color:var(--foreground)]">
        {t("aidPortfolioValue")}
      </div>
      <div className="text-lg font-semibold tabular-nums tracking-tight text-[color:var(--foreground)] sm:text-xl">
        {stealthMode ? "•••••" : formatCurrency(totals.totalCurrentEUR, activePortfolioCurrency)}
      </div>
      <div
        className={`text-[11px] tabular-nums sm:text-xs ${
          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
        }`}
      >
        <span>{dayLabel.pct}</span>
        {dayLabel.abs ? <span className="ml-1 font-medium">{dayLabel.abs}</span> : null}
        <span className="ml-1 text-[color:var(--muted)]">
          <DayMoveAsOf />
        </span>
      </div>
    </button>
  );
}
