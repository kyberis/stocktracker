"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculateTotalsByAssetType, calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_COLORS } from "./AssetTypeFilter";
import type { Holding, CashEntry, HoldingAssetType } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

type PerfMode = "total" | "daily";

const ROWS: { key: HoldingAssetType | "all"; labelKey: "allAssets" | "stocksLabel" | "etfsLabel" | "cryptoLabel" }[] = [
  { key: "all", labelKey: "allAssets" },
  { key: "stock", labelKey: "stocksLabel" },
  { key: "etf", labelKey: "etfsLabel" },
  { key: "crypto", labelKey: "cryptoLabel" },
];

export default function AssetPerformanceTable({ holdings, cashEntries }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const cur = activePortfolioCurrency;
  const [mode, setMode] = useState<PerfMode>("total");

  const { byType, allTotals } = useMemo(() => {
    const bt = calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, cur);
    const all = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, cur);
    return { byType: bt, allTotals: all };
  }, [holdings, cashEntries, quotes, exchangeRates, cur]);

  const hasMultipleTypes = [byType.stock, byType.etf, byType.crypto].filter(t => t.totalCurrentEUR > 0).length > 1;
  if (!hasMultipleTypes) return null;

  function getTotals(key: HoldingAssetType | "all") {
    if (key === "all") return allTotals;
    return byType[key];
  }

  const thClass = "text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 text-right py-2 px-2";
  const tdClass = "text-[12px] font-medium tabular-nums text-right py-2.5 px-2 border-t border-gray-100 dark:border-slate-800";

  const modes: { key: PerfMode; label: string }[] = [
    { key: "total", label: t("totalGainLabel") },
    { key: "daily", label: t("todayChange") },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">
          {t("performanceByAssetType")}
        </h3>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-white/[0.04] rounded-md p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
                mode === m.key
                  ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={`${thClass} text-left`}>{t("typeLabel")}</th>
              <th className={thClass}>{t("valueLabel")}</th>
              <th className={thClass}>{t("periodReturnLabel")}</th>
              <th className={thClass}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, labelKey }) => {
              const totals = getTotals(key);
              if (key !== "all" && totals.totalCurrentEUR <= 0) return null;

              const pl = mode === "total" ? totals.totalGainLoss : totals.dayGainLossEUR;
              const prevValue = totals.totalCurrentEUR - totals.dayGainLossEUR;
              const pctReturn = mode === "total"
                ? totals.totalGainLossPercent
                : prevValue > 0 ? (totals.dayGainLossEUR / prevValue) * 100 : 0;
              const isPos = pl >= 0;
              const color = ASSET_COLORS[key === "all" ? "all" : key];

              return (
                <tr key={key}>
                  <td className={`${tdClass} text-left`}>
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-800 dark:text-slate-200">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      {t(labelKey)}
                    </span>
                  </td>
                  <td className={`${tdClass} text-gray-700 dark:text-slate-300`}>
                    {stealthMode ? "•••••" : formatCurrency(totals.totalCurrentEUR, cur)}
                  </td>
                  <td className={`${tdClass} ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {isPos ? "+" : ""}{formatPercent(pctReturn)}
                  </td>
                  <td className={`${tdClass} ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {stealthMode ? "•••" : `${isPos ? "+" : ""}${formatCurrency(pl, cur)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
