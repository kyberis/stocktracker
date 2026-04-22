"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { getMarketStatus } from "@/lib/market-hours";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "@/components/dashboard-v2/AssetTypeFilter";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { Holding, CashEntry, HoldingAssetType } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onFilterChange?: (type: AssetFilter) => void;
  activeFilter?: AssetFilter;
}

/**
 * For stocks and ETFs, check if any holding in that group has an open market.
 * If none are open, the day change for the whole group is zeroed out.
 * Crypto is always considered active.
 */
function isAssetTypeMarketOpen(holdings: Holding[], assetType: HoldingAssetType): boolean {
  if (assetType === "crypto") return true;
  return holdings
    .filter((h) => (h.assetType ?? "stock") === assetType)
    .some((h) => {
      const ex = h.exchange?.toUpperCase();
      return ex ? getMarketStatus(ex).isOpen : false;
    });
}

export default function MarketAwareBreakdown({ holdings, cashEntries, onFilterChange, activeFilter }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const cur = activePortfolioCurrency;

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, cur),
    [holdings, cashEntries, quotes, exchangeRates, cur],
  );

  const marketOpen = useMemo(
    () => ({
      stock: isAssetTypeMarketOpen(holdings, "stock"),
      etf: isAssetTypeMarketOpen(holdings, "etf"),
      crypto: true,
    }),
    [holdings],
  );

  const investedTotal =
    byType.stock.totalCurrentEUR + byType.etf.totalCurrentEUR + byType.crypto.totalCurrentEUR;

  const allDayPL =
    (marketOpen.stock ? byType.stock.dayGainLossEUR : 0) +
    (marketOpen.etf ? byType.etf.dayGainLossEUR : 0) +
    (marketOpen.crypto ? byType.crypto.dayGainLossEUR : 0);
  const allPriorClose = investedTotal - allDayPL;
  const allDayPct = allPriorClose > 0 ? (allDayPL / allPriorClose) * 100 : 0;
  const anyMarketOpen = marketOpen.stock || marketOpen.etf;

  const hasAnyValue = investedTotal > 0;
  if (!hasAnyValue) return null;

  const activeKey: AssetFilter = activeFilter ?? "all";

  type Entry = {
    key: AssetFilter;
    label: string;
    value: number;
    alloc: number;
    dayPct: number;
    marketOpen: boolean;
  };

  // When the portfolio holds only a single asset type, the "All Assets" pill
  // would mirror the lone type pill exactly (same value, same day change).
  // Suppress it to keep the strip honest and free up horizontal space.
  const activeTypeCount =
    (byType.stock.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.etf.totalCurrentEUR > 0 ? 1 : 0) +
    (byType.crypto.totalCurrentEUR > 0 ? 1 : 0);
  const showAllPill = activeTypeCount > 1;

  const entries: Entry[] = [
    ...(showAllPill
      ? [{
          key: "all" as AssetFilter,
          label: t("allAssets"),
          value: investedTotal,
          alloc: 100,
          dayPct: allDayPct,
          marketOpen: anyMarketOpen || true, // always show value; day cell will decide
        }]
      : []),
    {
      key: "stock",
      label: t("stocksLabel"),
      value: byType.stock.totalCurrentEUR,
      alloc: byType.allocations.stock,
      dayPct: byType.stock.totalCurrentEUR > 0 && (byType.stock.totalCurrentEUR - byType.stock.dayGainLossEUR) > 0
        ? (byType.stock.dayGainLossEUR / (byType.stock.totalCurrentEUR - byType.stock.dayGainLossEUR)) * 100
        : 0,
      marketOpen: marketOpen.stock,
    },
    {
      key: "etf",
      label: t("etfsLabel"),
      value: byType.etf.totalCurrentEUR,
      alloc: byType.allocations.etf,
      dayPct: byType.etf.totalCurrentEUR > 0 && (byType.etf.totalCurrentEUR - byType.etf.dayGainLossEUR) > 0
        ? (byType.etf.dayGainLossEUR / (byType.etf.totalCurrentEUR - byType.etf.dayGainLossEUR)) * 100
        : 0,
      marketOpen: marketOpen.etf,
    },
    {
      key: "crypto",
      label: t("cryptoLabel"),
      value: byType.crypto.totalCurrentEUR,
      alloc: byType.allocations.crypto,
      dayPct: byType.crypto.totalCurrentEUR > 0 && (byType.crypto.totalCurrentEUR - byType.crypto.dayGainLossEUR) > 0
        ? (byType.crypto.dayGainLossEUR / (byType.crypto.totalCurrentEUR - byType.crypto.dayGainLossEUR)) * 100
        : 0,
      marketOpen: true,
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
        const showDayCell = e.key === "all" ? anyMarketOpen : e.marketOpen;
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
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 shrink-0">
                    {t("marketClosed")}
                  </span>
                )}
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
