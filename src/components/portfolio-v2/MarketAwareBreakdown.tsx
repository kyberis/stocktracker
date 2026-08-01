"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { computeDayChangeByType } from "@/lib/day-change-pct";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "@/components/dashboard-v2/AssetTypeFilter";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onFilterChange?: (type: AssetFilter) => void;
  activeFilter?: AssetFilter;
}

/**
 * Compact asset-type pills with day change aligned to the performance matrix.
 */
export default function MarketAwareBreakdown({ holdings, cashEntries, onFilterChange, activeFilter }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const cur = activePortfolioCurrency;

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, cur),
    [holdings, cashEntries, quotes, exchangeRates, cur],
  );

  const dayChange = useMemo(
    () => computeDayChangeByType(holdings, quotes, exchangeRates, cur),
    [holdings, quotes, exchangeRates, cur],
  );

  const investedTotal =
    byType.stock.totalCurrentEUR + byType.etf.totalCurrentEUR + byType.fund.totalCurrentEUR + byType.crypto.totalCurrentEUR;

  const hasAnyValue = investedTotal > 0;
  if (!hasAnyValue) return null;

  const activeKey: AssetFilter = activeFilter ?? "all";

  type Entry = {
    key: AssetFilter;
    label: string;
    value: number;
    alloc: number;
    dayPct: number;
    showDayChange: boolean;
  };

  // When the portfolio holds only a single asset type, the "All Assets" pill
  // would mirror the lone type pill exactly (same value, same day change).
  // Suppress it to keep the strip honest and free up horizontal space.
  const activeTypeCount =
    (byType.stock.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.etf.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.fund.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.crypto.totalCurrentEUR > 0 ? 1 : 0);
  const showAllPill = activeTypeCount > 1;

  const entries: Entry[] = [
    ...(showAllPill
      ? [{
          key: "all" as AssetFilter,
          label: t("allAssets"),
          value: investedTotal,
          alloc: 100,
          dayPct: dayChange.pct.all ?? 0,
          showDayChange: dayChange.abs.all != null,
        }]
      : []),
    {
      key: "stock",
      label: t("stocksLabel"),
      value: byType.stock.totalCurrentEUR,
      alloc: byType.allocations.stock,
      dayPct: dayChange.pct.stock ?? 0,
      showDayChange: dayChange.abs.stock != null,
    },
    {
      key: "etf",
      label: t("etfsLabel"),
      value: byType.etf.totalCurrentEUR,
      alloc: byType.allocations.etf,
      dayPct: dayChange.pct.etf ?? 0,
      showDayChange: dayChange.abs.etf != null,
    },
    {
      key: "fund",
      label: t("fundsLabel"),
      value: byType.fund.totalCurrentEUR,
      alloc: byType.allocations.fund,
      dayPct: dayChange.pct.fund ?? 0,
      showDayChange: dayChange.abs.fund != null,
    },
    {
      key: "crypto",
      label: t("cryptoLabel"),
      value: byType.crypto.totalCurrentEUR,
      alloc: byType.allocations.crypto,
      dayPct: dayChange.pct.crypto ?? 0,
      showDayChange: dayChange.abs.crypto != null,
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
        const showDayCell = e.showDayChange;
        const dayIsPos = e.dayPct >= 0;

        return (
          <button
            key={e.key}
            type="button"
            onClick={() => onFilterChange?.(isSelected ? "all" : e.key)}
            aria-pressed={isSelected}
            className={`relative overflow-hidden rounded-[20px] border p-3 text-left transition-colors backdrop-blur-md ${
              isSelected
                ? "border-transparent"
                : "border-white/10 hover:border-white/20"
            }`}
            style={isSelected ? {
              borderColor: `color-mix(in srgb, ${color} 38%, transparent)`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, rgba(255,255,255,0.08)), rgba(255,255,255,0.02)), color-mix(in srgb, ${color} 4%, var(--card))`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 30%, transparent), 0 16px 32px rgba(2,8,20,0.18)`,
            } : {
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), var(--card)",
              boxShadow: "0 12px 24px rgba(2,8,20,0.12)",
            }}
          >
            <span
              className="absolute top-0 left-0 w-[3px] h-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <div className="pl-1.5">
              <div className="flex items-center justify-between gap-2 min-h-[14px]">
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  {e.label}
                </span>
                {showDayCell ? (
                  <span
                    className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                      dayIsPos
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {dayIsPos ? "+" : ""}{e.dayPct.toFixed(2)}%
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-medium text-[color:var(--muted)]">
                    {t("marketClosed")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold tabular-nums truncate text-[color:var(--foreground)]">
                {stealthMode ? "•••••" : formatCurrency(e.value, cur)}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(e.alloc, 0), 100)}%`, background: color }}
                  />
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-[color:var(--muted)]">
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
