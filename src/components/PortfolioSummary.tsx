"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, formatStealthCurrency } from "@/lib/utils";
import { calculatePortfolioTotals, computeAllocationByType, type AllocationSlice } from "@/lib/portfolio-summary";
import { useStealthMode } from "@/lib/stealth-context";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import type { Holding, CashEntry } from "@/lib/types";
import PortfolioReviewCard from "./PortfolioReviewCard";

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
  const { user } = useAuth();
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

  const isPro = user?.plan === "pro";
  const limit = PLATFORM_LIMITS.PORTFOLIO_REVIEW_MONTHLY_LIMIT;
  const used = user?.portfolioReviewCount ?? 0;
  const remaining = Math.max(0, limit - used);
  const hasHoldings = holdings.length > 0;

  const [reviewOpen, setReviewOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const allocationRef = useRef<HTMLDivElement>(null);

  const allocationSlices = useMemo(
    () => computeAllocationByType(holdings, cashEntries, quotes, exchangeRates),
    [holdings, cashEntries, quotes, exchangeRates],
  );

  useEffect(() => {
    if (!allocationOpen) return;
    function handleClick(e: MouseEvent) {
      if (allocationRef.current && !allocationRef.current.contains(e.target as Node)) {
        setAllocationOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAllocationOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [allocationOpen]);

  return (
    <div className="card px-5 py-4 relative">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-2xl">
          <div className="h-full w-1/3 bg-emerald-500/70 dark:bg-emerald-400/50 animate-progress-bar" />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p
              className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ${isLoading ? "animate-value-shimmer" : ""}`}
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

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          <span className={`font-medium ${totalIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {formatPercent(totalGainLossPercent)} {t("totalGainLoss").toLowerCase()}
          </span>
          <span className="text-gray-300 dark:text-slate-600">·</span>
          <span>{holdingsCount} {t("holdings").toLowerCase()}</span>
          {allocationSlices.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-slate-600">·</span>
              <div className="relative" ref={allocationRef}>
                <button
                  onClick={() => setAllocationOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                  aria-label={t("assetAllocation")}
                  title={t("assetAllocation")}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                </button>
                {allocationOpen && (
                  <AllocationPopover
                    slices={allocationSlices}
                    title={t("assetAllocation")}
                    stealthMode={stealthMode}
                  />
                )}
              </div>
            </>
          )}
          <span className="text-gray-300 dark:text-slate-600">·</span>
          {isPro ? (
            <button
              onClick={() => setReviewOpen(!reviewOpen)}
              disabled={!hasHoldings || remaining <= 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI Review
              <span className="tabular-nums text-gray-400 dark:text-slate-500">{used}/{limit}</span>
            </button>
          ) : (
            <a
              href="/billing"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI Review
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300">
                Pro
              </span>
            </a>
          )}
        </div>
      </div>

      {reviewOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <PortfolioReviewCard />
        </div>
      )}
    </div>
  );
}

function getArc(startPct: number, endPct: number): string {
  const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2;
  const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2;
  const r = 40;
  const cx = 50, cy = 50;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endPct - startPct > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function AllocationPopover({
  slices,
  title,
  stealthMode,
}: {
  slices: AllocationSlice[];
  title: string;
  stealthMode: boolean;
}) {
  let cumulative = 0;
  const segments = slices.map((s) => {
    const start = cumulative;
    cumulative += s.percent;
    return { ...s, start, end: cumulative };
  });

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 p-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3">{title}</p>
      <div className="flex justify-center mb-3">
        <svg viewBox="0 0 100 100" className="w-28 h-28">
          {segments.map((seg, i) =>
            seg.percent > 0.1 ? (
              <path
                key={i}
                d={getArc(seg.start, seg.end)}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeLinecap="butt"
              />
            ) : null,
          )}
        </svg>
      </div>
      <div className="space-y-1.5">
        {slices.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600 dark:text-slate-300">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-gray-500 dark:text-slate-400">
                {stealthMode ? "•••••" : formatCurrency(s.valueEUR, "EUR")}
              </span>
              <span className="font-medium text-gray-700 dark:text-slate-200 w-12 text-right">
                {formatPercent(s.percent)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
