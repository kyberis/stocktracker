"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "./AssetTypeFilter";
import type { AssetFilter } from "./AssetTypeFilter";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onFilterChange?: (type: AssetFilter) => void;
  activeFilter?: AssetFilter;
}

export default function AssetBreakdownCards({ holdings, cashEntries, onFilterChange, activeFilter }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const cur = activePortfolioCurrency;

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, cur),
    [holdings, cashEntries, quotes, exchangeRates, cur],
  );

  const investedTotal =
    byType.stock.totalCurrentEUR +
    byType.etf.totalCurrentEUR +
    byType.fund.totalCurrentEUR +
    byType.crypto.totalCurrentEUR +
    byType.fixed_return.totalCurrentEUR;
  const allDayPL =
    byType.stock.dayGainLossEUR +
    byType.etf.dayGainLossEUR +
    byType.fund.dayGainLossEUR +
    byType.crypto.dayGainLossEUR +
    byType.fixed_return.dayGainLossEUR;
  const allPriorClose = investedTotal - allDayPL;
  const allDayPct = allPriorClose > 0 ? (allDayPL / allPriorClose) * 100 : 0;

  const hasAnyValue = investedTotal > 0;
  if (!hasAnyValue) return null;

  const activeKey: AssetFilter = activeFilter ?? "all";

  type Entry = {
    key: AssetFilter;
    label: string;
    value: number;
    alloc: number;
    dayPct: number;
  };

  const activeTypeCount =
    (byType.stock.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.etf.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.fund.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.crypto.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.fixed_return.totalCurrentEUR > 0 ? 1 : 0);
  const showAllPill = activeTypeCount > 1;

  function dayPctFor(totals: { totalCurrentEUR: number; dayGainLossEUR: number }): number {
    const prior = totals.totalCurrentEUR - totals.dayGainLossEUR;
    return totals.totalCurrentEUR > 0 && prior > 0 ? (totals.dayGainLossEUR / prior) * 100 : 0;
  }

  const entries: Entry[] = [
    ...(showAllPill
      ? [{ key: "all" as AssetFilter, label: t("allAssets"), value: investedTotal, alloc: 100, dayPct: allDayPct }]
      : []),
    {
      key: "stock",
      label: t("stocksLabel"),
      value: byType.stock.totalCurrentEUR,
      alloc: byType.allocations.stock,
      dayPct: dayPctFor(byType.stock),
    },
    {
      key: "etf",
      label: t("etfsLabel"),
      value: byType.etf.totalCurrentEUR,
      alloc: byType.allocations.etf,
      dayPct: dayPctFor(byType.etf),
    },
    {
      key: "fund",
      label: t("fundsLabel"),
      value: byType.fund.totalCurrentEUR,
      alloc: byType.allocations.fund,
      dayPct: dayPctFor(byType.fund),
    },
    {
      key: "crypto",
      label: t("cryptoLabel"),
      value: byType.crypto.totalCurrentEUR,
      alloc: byType.allocations.crypto,
      dayPct: dayPctFor(byType.crypto),
    },
    {
      key: "fixed_return",
      label: t("assetTypeFixedReturn"),
      value: byType.fixed_return.totalCurrentEUR,
      alloc: byType.allocations.fixed_return,
      dayPct: dayPctFor(byType.fixed_return),
    },
  ];

  const visibleEntries = entries.filter((e) => e.key === "all" || e.value > 0);
  const colsClass =
    visibleEntries.length <= 1
      ? "grid-cols-1"
      : visibleEntries.length === 2
        ? "grid-cols-2"
        : visibleEntries.length === 3
          ? "grid-cols-3 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <div
      className={`grid ${colsClass} gap-2`}
      role="group"
      aria-label={t("allAssets")}
    >
      {visibleEntries.map((e) => {
        const color = ASSET_COLORS[e.key];
        const isSelected = activeKey === e.key;
        const dayIsPos = e.dayPct >= 0;

        return (
          <button
            key={e.key}
            type="button"
            onClick={() => onFilterChange?.(isSelected ? "all" : e.key)}
            aria-pressed={isSelected}
            className={`relative overflow-hidden text-left rounded-lg border p-2.5 transition-colors ${
              isSelected
                ? "border-transparent"
                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
            }`}
            style={isSelected ? {
              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
              background: `color-mix(in srgb, ${color} 5%, var(--card))`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
            } : { background: "var(--card)" }}
          >
            <span
              className="absolute top-0 left-0 w-[3px] h-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <div className="pl-1.5">
              <div className="flex items-center justify-between gap-2 min-h-[14px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 truncate">
                  {e.label}
                </span>
                <span
                  className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                    dayIsPos
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {dayIsPos ? "+" : ""}{e.dayPct.toFixed(2)}%
                </span>
              </div>
              <p className="mt-1 text-sm font-bold tabular-nums text-gray-900 dark:text-white truncate">
                {stealthMode ? "•••••" : formatCurrency(e.value, cur)}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 h-[2px] rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(e.alloc, 0), 100)}%`, background: color }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-gray-500 dark:text-slate-500 shrink-0">
                  {formatPercent(e.alloc)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
