"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import PortfolioEvolutionChart from "../PortfolioEvolutionChart";
import BenchmarkDropdown, { OVERLAY_BENCHMARKS } from "./BenchmarkDropdown";
import type { BenchmarkOverlay } from "../PortfolioEvolutionChart";
import type { Holding, CashEntry } from "@/lib/types";

const STORAGE_KEY = "trefolio-benchmark-overlay-v1";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onOpenAi?: () => void;
}

export default function CompactHeroChart({ holdings, cashEntries, onOpenAi }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency, lastUpdated } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const cur = activePortfolioCurrency;
  const isPositive = totals.dayGainLossEUR >= 0;
  const dayPct = totals.totalCurrentEUR > 0
    ? (totals.dayGainLossEUR / (totals.totalCurrentEUR - totals.dayGainLossEUR)) * 100
    : 0;
  const totalPct = totals.totalGainLossPercent;
  const isTotalPositive = totals.totalGainLoss >= 0;

  const syncAgo = useMemo(() => {
    if (!lastUpdated) return null;
    const mins = Math.round((Date.now() - lastUpdated.getTime()) / 60000);
    if (mins < 1) return "<1m";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, [lastUpdated]);

  // Benchmark overlay state — persisted in localStorage
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as string[];
    } catch { /* ignore */ }
    return [];
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const benchmarks: BenchmarkOverlay[] = useMemo(
    () =>
      selectedKeys
        .map((key) => {
          const def = OVERLAY_BENCHMARKS.find((b) => b.key === key);
          if (!def) return null;
          return { key: def.key, symbol: def.symbol, label: t(def.labelKey as Parameters<typeof t>[0]), color: def.color };
        })
        .filter(Boolean) as BenchmarkOverlay[],
    [selectedKeys, t],
  );

  const handleRemoveBenchmark = useCallback((key: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  return (
    <div className="card overflow-hidden">
      {/* Hero header */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1">
          {t("v2PortfolioValue")}
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-white leading-none">
          {stealthMode ? "•••••" : formatCurrency(totals.totalCurrentEUR, cur)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 text-[13px] font-semibold px-3 py-1 rounded-full ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-500 dark:text-red-400"
            }`}
          >
            {stealthMode
              ? "•••••"
              : `${isPositive ? "+" : ""}${formatCurrency(totals.dayGainLossEUR, cur)} (${isPositive ? "+" : ""}${formatPercent(dayPct)})`}
          </span>
          <span
            className={`text-[13px] font-medium ${
              isTotalPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {stealthMode ? "•••••" : `${isTotalPositive ? "+" : ""}${formatPercent(totalPct)} ${t("v2TotalGainLoss").toLowerCase()}`}
          </span>
        </div>
      </div>

      {/* Chart component — embedded strips the card wrapper */}
      <PortfolioEvolutionChart
        embedded
        benchmarks={benchmarks.length > 0 ? benchmarks : undefined}
        onRemoveBenchmark={handleRemoveBenchmark}
      />

      {/* Footer: sync + compare + AI link */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 dark:border-white/[0.04]">
        {syncAgo && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-500">
            <span className="relative w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
              <span className="absolute inset-[1px] rounded-full bg-emerald-500" />
            </span>
            {t("v2LastSynced")} {syncAgo} {t("v2AgoVia").toLowerCase()}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {/* Compare benchmark button + dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                dropdownOpen || selectedKeys.length > 0
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-500 dark:text-blue-400"
                  : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-blue-400/40 hover:text-blue-500"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              {t("benchmarkCompare")}
              {selectedKeys.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold">
                  {selectedKeys.length}
                </span>
              )}
              <svg className="w-2.5 h-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <BenchmarkDropdown
              selected={selectedKeys}
              onChange={setSelectedKeys}
              isOpen={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
            />
          </div>

          {onOpenAi && (
            <button
              onClick={onOpenAi}
              className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {t("v2AskAiChart")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
