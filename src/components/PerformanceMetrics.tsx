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

  const ttwror = calculateTTWROR(txs, totalCurrentEUR, totalCostEUR);
  const cashFlows = buildXIRRCashFlows(txs, totalCurrentEUR);
  const irr = cashFlows.length >= 2 ? calculateXIRR(cashFlows) : 0;

  const simpleReturn = totalCostEUR > 0 ? ((totalCurrentEUR - totalCostEUR) / totalCostEUR) * 100 : 0;

  const hasTxData = txs.length > 0;

  const metrics = [
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
          const isPositive = m.value >= 0;
          const color = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
          const bg = isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10";
          return (
            <div key={m.label} className={`${bg} rounded-xl p-3 text-center`} title={m.tooltip}>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">{m.label}</p>
              <p className={`text-xl font-bold ${color}`}>
                {isPositive ? "+" : ""}{m.value.toFixed(2)}%
              </p>
              {!m.active && (
                <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("addTransaction")} for precise metrics
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
