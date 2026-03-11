"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { calculateTTWROR, calculateXIRR, buildXIRRCashFlows } from "@/lib/performance";
import type { Transaction, Holding, CashEntry } from "@/lib/types";

const PerformanceExplainerModal = dynamic(() => import("./PerformanceExplainerModal"), { ssr: false });

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PerformanceMetrics({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  }, []);

  const { totalCurrentEUR, totalCostEUR } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);

  const ttwror = calculateTTWROR(txs, totalCurrentEUR, totalCostEUR, exchangeRates, baseCurrency);
  const cashFlows = buildXIRRCashFlows(txs, totalCurrentEUR, exchangeRates, baseCurrency);
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
      <button
        onClick={() => setShowExplainer(true)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors p-3 group"
      >
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {t("perfExplHowCalculated")}
        </span>
      </button>
      {showExplainer && (
        <PerformanceExplainerModal
          isOpen={showExplainer}
          onClose={() => setShowExplainer(false)}
          transactions={txs}
          currentValueEUR={totalCurrentEUR}
          totalInvestedEUR={totalCostEUR}
          exchangeRates={exchangeRates}
          ttwror={hasTxData ? ttwror : simpleReturn}
          irr={hasTxData ? irr : null}
        />
      )}
    </div>
  );
}
