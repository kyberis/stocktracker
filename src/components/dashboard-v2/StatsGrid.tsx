"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent, resolveQuoteCurrency, convertCurrency } from "@/lib/utils";
import { getHoldingsLimit } from "@/lib/subscription";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  snapshotInvested?: number | null;
  /** Render without the card wrapper — used when embedded inside another card */
  inline?: boolean;
}

export default function StatsGrid({ holdings, cashEntries, snapshotInvested, inline }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const investedCost = snapshotInvested ?? totals.totalCostEUR;
  const gainLoss = totals.totalCurrentEUR - investedCost;
  const dayChange = totals.dayGainLossEUR;
  const dayIsPositive = dayChange >= 0;
  const dayPct = totals.totalCurrentEUR > 0
    ? (dayChange / (totals.totalCurrentEUR - dayChange)) * 100
    : 0;

  const cur = activePortfolioCurrency;

  const { divYield, annualDivIncome } = useMemo(() => {
    if (totals.totalCurrentEUR <= 0) return { divYield: 0, annualDivIncome: 0 };
    let annualDivBase = 0;
    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (q?.trailingAnnualDividendRate && q.trailingAnnualDividendRate > 0) {
        const divCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency || h.displayCurrency);
        const divLocal = q.trailingAnnualDividendRate * h.shares;
        annualDivBase += convertCurrency(divLocal, divCurrency, cur, exchangeRates);
      }
    }
    return {
      divYield: (annualDivBase / totals.totalCurrentEUR) * 100,
      annualDivIncome: annualDivBase,
    };
  }, [holdings, quotes, exchangeRates, cur, totals.totalCurrentEUR]);

  const isGain = gainLoss >= 0;

  const cells: { label: string; value: string; accent?: boolean; positive?: boolean; highlight?: boolean }[] = [
    { label: t("v2Cost"), value: stealthMode ? "•••••" : formatCurrency(investedCost, cur) },
    {
      label: t("v2GainLoss"),
      value: stealthMode ? "•••••" : `${isGain ? "+" : ""}${formatCurrency(gainLoss, cur)}`,
      accent: true,
      positive: isGain,
    },
    {
      label: t("dayChange"),
      value: stealthMode ? "•••••" : `${dayIsPositive ? "+" : ""}${formatCurrency(dayChange, cur)} ${dayIsPositive ? "▲" : "▼"} ${formatPercent(Math.abs(dayPct))}`,
      accent: true,
      positive: dayIsPositive,
      highlight: true,
    },
    { label: t("v2DivYield"), value: `${divYield.toFixed(2)}%` },
    {
      label: t("v2Holdings"),
      value: holdingsLimit < Infinity ? `${holdings.length}/${holdingsLimit}` : String(holdings.length),
      accent: holdingsLimit < Infinity,
      positive: holdings.length < holdingsLimit,
    },
    {
      label: t("estAnnualIncome"),
      value: stealthMode ? "•••••" : `${formatCurrency(annualDivIncome, cur)}/yr`,
    },
  ];

  const gridContent = (
    <div className={`grid gap-1.5 ${inline ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2"}`}>
      {cells.map((c) => (
        <div
          key={c.label}
          className={`rounded-lg px-2.5 py-2 ${
            c.highlight
              ? c.positive
                ? "bg-emerald-50 dark:bg-emerald-500/[0.06] border border-emerald-200/60 dark:border-emerald-500/15"
                : "bg-red-50 dark:bg-red-500/[0.06] border border-red-200/60 dark:border-red-500/15"
              : "bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]"
          }`}
        >
          <p className="text-[9px] font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide">
            {c.label}
          </p>
          <p
            className={`text-sm font-bold tabular-nums mt-0.5 ${
              c.accent
                ? c.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );

  if (inline) return gridContent;

  return (
    <div className="card p-3">
      {gridContent}
    </div>
  );
}
