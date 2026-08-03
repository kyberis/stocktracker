"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import {
  getDayChange,
  getDividendYield,
  getEstimatedAnnualDividendIncome,
} from "@/lib/portfolio/metrics";
import { formatCurrency, formatPercent } from "@/lib/utils";
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

  const dayHeadline = useMemo(
    () => getDayChange(holdings, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, quotes, exchangeRates, activePortfolioCurrency],
  );

  const investedCost = snapshotInvested ?? totals.totalCostEUR;
  const gainLoss = totals.totalCurrentEUR - investedCost;
  const dayChange = dayHeadline.amount;
  const dayIsPositive = dayChange >= 0;
  const dayPct = dayHeadline.pct;

  const cur = activePortfolioCurrency;

  const { divYield, annualDivIncome } = useMemo(() => {
    // No investedTotal override here (TRF-004-B): totals.totalCurrentEUR is
    // net worth (cash included, via calculatePortfolioTotals(holdings,
    // cashEntries, ...) above), but getDividendYield's denominator is
    // invested-only. Passing net worth diluted Home's yield below what
    // /tools/dividends shows for the same portfolio. Omitting the argument
    // lets the function derive the correct invested-only total itself.
    const yieldPct = getDividendYield(holdings, quotes, exchangeRates, cur);
    return {
      divYield: yieldPct,
      annualDivIncome: getEstimatedAnnualDividendIncome(holdings, quotes, exchangeRates, cur),
    };
  }, [holdings, quotes, exchangeRates, cur]);

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
    { label: t("v2DivYield"), value: divYield == null ? "—" : `${divYield.toFixed(2)}%` },
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
          className={`rounded-[16px] border px-3 py-3 ${
            c.highlight
              ? c.positive
                ? "bg-emerald-500/[0.1] border-emerald-400/16 shadow-[0_10px_24px_rgba(16,185,129,0.08)]"
                : "bg-red-500/[0.1] border-red-400/16 shadow-[0_10px_24px_rgba(239,68,68,0.08)]"
              : "bg-[color:var(--surface-soft)] border-[color:var(--border)] shadow-[0_10px_24px_rgba(2,8,20,0.14)]"
          }`}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            {c.label}
          </p>
          <p
            className={`text-sm font-bold tabular-nums mt-0.5 ${
              c.accent
                ? c.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
                : "text-[color:var(--foreground)]"
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
