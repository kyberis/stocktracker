"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals, computeAllocationByType, type AllocationSlice } from "@/lib/portfolio-summary";
import { useStealthMode } from "@/lib/stealth-context";
import { useTheme } from "@/lib/theme-context";
import type { Holding, CashEntry, ManualAssetType, HoldingAssetType } from "@/lib/types";

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  stock: { label: "investments", icon: "📈", color: "#6366f1" },
  etf: { label: "investments", icon: "📈", color: "#10b981" },
  crypto: { label: "investments", icon: "₿", color: "#f59e0b" },
  real_estate: { label: "realEstate", icon: "🏠", color: "#3b82f6" },
  savings: { label: "savingsAccounts", icon: "🏦", color: "#06b6d4" },
  pension: { label: "pensionRetirement", icon: "🏛️", color: "#8b5cf6" },
  fixed_return: { label: "assetTypeFixedReturn", icon: "📉", color: "#0ea5e9" },
  cash: { label: "assetTypeCash", icon: "💵", color: "#64748b" },
};

interface BreakdownItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  value: number;
}

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

function DonutChart({ slices, total, baseCurrency, stealth }: {
  slices: AllocationSlice[];
  total: number;
  baseCurrency: string;
  stealth: boolean;
}) {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 220 220" className="w-44 h-44 sm:w-52 sm:h-52">
      {slices.map((slice) => {
        const dashLen = (slice.percent / 100) * circumference;
        const currentOffset = offset;
        offset += dashLen;
        return (
          <circle
            key={slice.key}
            cx="110" cy="110" r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="26"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={-currentOffset}
            transform="rotate(-90 110 110)"
            opacity="0.9"
          />
        );
      })}
      <text x="110" y="100" textAnchor="middle" className="fill-gray-400 dark:fill-slate-500 text-[11px]">
        Net Worth
      </text>
      <text x="110" y="122" textAnchor="middle" className="fill-gray-900 dark:fill-white text-[15px] font-bold">
        {stealth ? "••••" : formatCurrency(total, baseCurrency)}
      </text>
    </svg>
  );
}

export default function NetWorthSummary({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const {
    holdings: ctxHoldings, cashEntries: ctxCashEntries,
    quotes, exchangeRates, isLoading, activePortfolioCurrency,
  } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;
  const { t } = useI18n();
  const { stealthMode: isStealth } = useStealthMode();
  const { layoutTheme } = useTheme();

  const hasManualAssets = cashEntries.some((c) => c.type && c.type !== "cash");

  const { totalCurrentEUR, dayGainLossEUR } = calculatePortfolioTotals(
    holdings, cashEntries, quotes, exchangeRates, baseCurrency
  );

  const allocationSlices = useMemo(() =>
    computeAllocationByType(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency]
  );

  const breakdown = useMemo<BreakdownItem[]>(() => {
    const investmentTypes = new Set<HoldingAssetType>(["stock", "etf", "fund", "crypto"]);
    const investmentSlices = allocationSlices.filter((s) => investmentTypes.has(s.key as HoldingAssetType));
    const investmentTotal = investmentSlices.reduce((sum, s) => sum + s.valueEUR, 0);

    const items: BreakdownItem[] = [];
    if (investmentTotal > 0) {
      items.push({
        key: "investments",
        label: t("investments"),
        icon: "📈",
        color: "#6366f1",
        value: investmentTotal,
      });
    }

    const fixedSlice = allocationSlices.find((s) => s.key === "fixed_return");
    if (fixedSlice && fixedSlice.valueEUR > 0) {
      const existing = items.find((i) => i.key === "investments");
      if (existing) {
        existing.value += fixedSlice.valueEUR;
      } else {
        items.push({
          key: "investments",
          label: t("investments"),
          icon: "📈",
          color: "#6366f1",
          value: fixedSlice.valueEUR,
        });
      }
    }

    const manualTypes: ManualAssetType[] = ["real_estate", "savings", "pension", "cash"];
    for (const type of manualTypes) {
      const slice = allocationSlices.find((s) => s.key === type);
      if (slice && slice.valueEUR > 0) {
        const meta = CATEGORY_META[type];
        items.push({
          key: type,
          label: t(meta.label as Parameters<typeof t>[0]),
          icon: meta.icon,
          color: meta.color,
          value: slice.valueEUR,
        });
      }
    }

    return items;
  }, [allocationSlices, t]);

  if (!hasManualAssets && holdings.length === 0) return null;
  if (!hasManualAssets) return null;

  const prevValue = totalCurrentEUR - dayGainLossEUR;
  const dayPercent = prevValue > 0 ? (dayGainLossEUR / prevValue) * 100 : 0;

  const cardClass =
    layoutTheme === "terminal"
      ? "border border-zinc-800 rounded-none p-4 sm:p-5"
      : layoutTheme === "canvas"
        ? "bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
        : layoutTheme === "studio"
          ? "rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-5"
          : "card";

  return (
    <div className={`${cardClass} mb-4`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        {/* Left: Total + Breakdown */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            {t("totalNetWorth")}
          </p>
          {isLoading ? (
            <div className="h-9 w-48 bg-gray-100 dark:bg-slate-700 rounded animate-pulse mb-2" />
          ) : (
            <p className="font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight" style={{ fontSize: "var(--text-hero)" }}>
              {isStealth ? "••••••" : formatCurrency(totalCurrentEUR, baseCurrency)}
            </p>
          )}

          {!isLoading && dayGainLossEUR !== 0 && (
            <span
              className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums ${
                dayGainLossEUR >= 0
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {dayGainLossEUR >= 0
                  ? <path d="M18 15l-6-6-6 6" />
                  : <path d="M6 9l6 6 6-6" />}
              </svg>
              {isStealth ? "••••" : `${formatCurrency(dayGainLossEUR, baseCurrency)} (${formatPercent(dayPercent)})`}
            </span>
          )}

          {/* Breakdown grid */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {breakdown.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                    {item.label}
                  </p>
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0">
                  {isStealth ? "••••" : formatCurrency(item.value, baseCurrency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Donut Chart */}
        {allocationSlices.length > 0 && (
          <div className="flex items-center justify-center">
            <DonutChart
              slices={allocationSlices}
              total={totalCurrentEUR}
              baseCurrency={baseCurrency}
              stealth={isStealth}
            />
          </div>
        )}
      </div>
    </div>
  );
}
