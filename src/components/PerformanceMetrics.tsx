"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { calculateTTWROR, calculateXIRR, buildXIRRCashFlows } from "@/lib/performance";
import type { Transaction } from "@/lib/types";

export default function PerformanceMetrics() {
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates } = usePortfolio();
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  }, []);

  const { totalCurrentEUR, totalCostEUR } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);

  const ttwror = calculateTTWROR(txs, totalCurrentEUR, totalCostEUR, exchangeRates);
  const cashFlows = buildXIRRCashFlows(txs, totalCurrentEUR, exchangeRates);
  const irr = cashFlows.length >= 2 ? calculateXIRR(cashFlows) : null;

  const simpleReturn = totalCostEUR > 0 ? ((totalCurrentEUR - totalCostEUR) / totalCostEUR) * 100 : 0;

  const hasTxData = txs.length > 0;

  const metrics: { label: string; tooltip: string; value: number | null; active: boolean }[] = [
    {
      label: t("ttwror"),
      tooltip: t("ttwrorFull"),
      value: hasTxData ? ttwror : simpleReturn,
      active: hasTxData,
    },
    {
      label: t("irr"),
      tooltip: t("irrFull"),
      value: hasTxData ? irr : 0,
      active: hasTxData,
    },
  ];

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("portfolioPerformance")}</h3>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const hasValue = m.value !== null;
          const isPositive = hasValue && m.value! >= 0;
          const color = !hasValue
            ? "text-gray-400 dark:text-slate-500"
            : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
          const bg = !hasValue
            ? "bg-gray-50 dark:bg-slate-800/50"
            : isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10";
          return (
            <div key={m.label} className={`${bg} rounded-xl p-3 text-center`} title={m.tooltip}>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">{m.label}</p>
              <p className={`text-xl font-bold ${color}`}>
                {hasValue
                  ? `${isPositive ? "+" : ""}${m.value!.toFixed(2)}%`
                  : "—"}
              </p>
              {!hasValue && (
                <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("irrNeedsTime")}
                </p>
              )}
              {!m.active && hasValue && (
                <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("addTransaction")} for precise metrics
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-3">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-slate-200 mb-1">
          {t("performanceMethodologyTitle")}
        </p>
        <p className="text-[11px] text-gray-600 dark:text-slate-300">{t("ttwrorExplanation")}</p>
        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-1">{t("irrExplanation")}</p>
      </div>
    </div>
  );
}
