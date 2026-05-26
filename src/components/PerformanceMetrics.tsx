"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { calculateTTWROR, calculateXIRR, buildXIRRCashFlows } from "@/lib/performance";
import DataUpgradeNudge from "./DataUpgradeNudge";
import type { Transaction, Holding, CashEntry } from "@/lib/types";

const BlurredProSection = dynamic(() => import("./BlurredProSection"), { ssr: false });
const PerformanceExplainerModal = dynamic(() => import("./PerformanceExplainerModal"), { ssr: false });
import TierFeatureBadge from "./TierFeatureBadge";
import { useTrack } from "@/lib/use-track";

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PerformanceMetrics({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, activePortfolioCurrency, demoMode } = usePortfolio();
  const { user } = useAuth();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;
  const isPaid = user?.plan === "pro";
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const track = useTrack();

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  }, [demoMode]);

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
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--foreground)]">
        {t("portfolioPerformance")}
        <TierFeatureBadge requiredPlan="pro" size="sm" />
        <button
          onClick={() => {
            track("performance_help_toggled");
            setShowHelp((v) => !v);
          }}
          className="ml-auto rounded-full p-1 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-emerald-400"
          aria-label={t("perfExplHowCalculated")}
          title={t("perfExplHowCalculated")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </h3>

      {showHelp && (
        <div className="mb-3 animate-in space-y-2.5 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 text-xs fade-in slide-in-from-top-1 duration-150">
          <div>
            <p className="font-semibold text-[color:var(--foreground)]">{t("ttwror")} — {t("ttwrorFull")}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--muted)]">{t("ttwrorExplanation")}</p>
          </div>
          <div>
            <p className="font-semibold text-[color:var(--foreground)]">{t("irr")} — {t("irrFull")}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--muted)]">{t("irrExplanation")}</p>
          </div>
        </div>
      )}

      {!hasTxData && (
        <DataUpgradeNudge
          variant="emerald"
          titleKey="nudgePerfTitle"
          descKey="nudgePerfDesc"
          dismissKey="nudge_perf_dismissed"
          dismissMode="session"
          className="mb-3"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const hasValue = m.value !== null;
          const isPositive = hasValue && m.value! >= 0;
          const color = !hasValue
            ? "text-gray-400 dark:text-slate-500"
            : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
          const bg = !hasValue
            ? "bg-gray-50 dark:bg-slate-800/50"
            : isPositive ? "border border-emerald-500/14 bg-emerald-500/[0.08]" : "border border-red-500/14 bg-red-500/[0.08]";
          return (
            <div key={m.label} className={`${bg} rounded-[16px] p-3 text-center`} title={m.tooltip}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted)]">{m.label}</p>
              <p className={`text-xl font-bold ${color}`}>
                {hasValue
                  ? `${isPositive ? "+" : ""}${m.value!.toFixed(2)}%`
                  : "—"}
              </p>
              {!hasValue && (
                <p className="mt-1 text-[9px] text-[color:var(--muted)]">
                  {t("irrNeedsTime")}
                </p>
              )}
              {!m.active && hasValue && (
                <p className="mt-1 text-[9px] text-[color:var(--muted)]">
                  {t("addTransaction")} for precise metrics
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          track("performance_explainer_opened");
          setShowExplainer(true);
        }}
        className="group mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 transition-colors hover:bg-[color:var(--surface-highlight)]"
      >
        <svg className="h-3.5 w-3.5 text-[color:var(--muted)] transition-colors group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] font-medium text-[color:var(--foreground)] transition-colors group-hover:text-emerald-300">
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
