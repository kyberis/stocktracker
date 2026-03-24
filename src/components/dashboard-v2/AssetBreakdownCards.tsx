"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "./AssetTypeFilter";
import type { AssetFilter } from "./AssetTypeFilter";
import type { Holding, CashEntry, HoldingAssetType } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onFilterChange?: (type: AssetFilter) => void;
  activeFilter?: AssetFilter;
}

const TYPES: { key: HoldingAssetType; labelKey: "stocksLabel" | "etfsLabel" | "cryptoLabel" }[] = [
  { key: "stock", labelKey: "stocksLabel" },
  { key: "etf", labelKey: "etfsLabel" },
  { key: "crypto", labelKey: "cryptoLabel" },
];

export default function AssetBreakdownCards({ holdings, cashEntries, onFilterChange, activeFilter }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const cur = activePortfolioCurrency;

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, cur),
    [holdings, cashEntries, quotes, exchangeRates, cur],
  );

  const hasAnyValue = byType.stock.totalCurrentEUR > 0 || byType.etf.totalCurrentEUR > 0 || byType.crypto.totalCurrentEUR > 0;
  if (!hasAnyValue) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TYPES.map(({ key, labelKey }) => {
        const totals = byType[key];
        if (totals.totalCurrentEUR <= 0) return null;
        const alloc = byType.allocations[key];
        const isPos = totals.dayGainLossEUR >= 0;
        const isTotalPos = totals.totalGainLoss >= 0;
        const isSelected = activeFilter === key;
        const color = ASSET_COLORS[key];

        return (
          <button
            key={key}
            onClick={() => onFilterChange?.(isSelected ? "all" : key)}
            className={`relative overflow-hidden text-left rounded-xl border p-4 transition-all ${
              isSelected
                ? "border-transparent ring-1 bg-opacity-5"
                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:-translate-y-px"
            }`}
            style={isSelected ? {
              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
              background: `color-mix(in srgb, ${color} 4%, var(--card))`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
            } : { background: "var(--card)" }}
          >
            {/* Left accent bar */}
            <span
              className="absolute top-0 left-0 w-[3px] h-full rounded-r"
              style={{ background: color }}
            />

            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                {t(labelKey)}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  isTotalPos
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-500 dark:text-red-400"
                }`}
              >
                {isTotalPos ? "+" : ""}{formatPercent(totals.totalGainLossPercent)}
              </span>
            </div>

            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white mb-1">
              {stealthMode ? "•••••" : formatCurrency(totals.totalCurrentEUR, cur)}
            </p>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={isPos ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 dark:text-red-400 font-medium"}>
                {stealthMode ? "•••" : `${isPos ? "+" : ""}${formatCurrency(totals.dayGainLossEUR, cur)}`}
                {" "}{t("todayChange")}
              </span>
              <span className="text-gray-300 dark:text-slate-600">·</span>
              <span className={isTotalPos ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 dark:text-red-400 font-medium"}>
                {stealthMode ? "•••" : `${isTotalPos ? "+" : ""}${formatCurrency(totals.totalGainLoss, cur)}`}
                {" "}{t("totalGainLabel")}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2.5 text-[10px] text-gray-500 dark:text-slate-500">
              <span>{formatPercent(alloc)} {t("ofPortfolio")}</span>
              <div className="flex-1 h-[3px] rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(alloc, 100)}%`, background: color }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
