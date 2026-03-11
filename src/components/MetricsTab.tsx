"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import TierFeatureBadge from "./TierFeatureBadge";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import {
  calculateTTWROR,
  calculateXIRR,
  buildXIRRCashFlows,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateAnnualizedVolatility,
  calculateBeta,
  computeDailyReturns,
  calculatePortfolioValueOnDate,
} from "@/lib/performance";
import { formatPercent } from "@/lib/utils";
import type { Transaction, Holding, CashEntry, HistoricalDataPoint } from "@/lib/types";

const BlurredProSection = dynamic(() => import("./BlurredProSection"), { ssr: false });

// ECB deposit rate (risk-free rate approximation, updated periodically)
const RISK_FREE_RATE_PCT = 3.5;

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

interface MetricCard {
  label: string;
  tooltip: string;
  value: string | null;
  isPro: boolean;
  metricKey: "sharpe" | "drawdown" | "beta" | "volatility";
}

export default function MetricsTab({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const { user } = useAuth();
  const track = useTrack();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [historySeries, setHistorySeries] = useState<Record<string, HistoricalDataPoint[]>>({});

  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  useEffect(() => {
    track("metrics_tab_viewed");
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPaid) return;
    const tickers = holdings.map((h) => h.ticker).slice(0, 10);
    Promise.allSettled(
      tickers.map((ticker) =>
        fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}&period=1y`)
          .then((r) => r.ok ? r.json() : [])
          .then((data: HistoricalDataPoint[]) => ({ ticker, data }))
      )
    ).then((results) => {
      const map: Record<string, HistoricalDataPoint[]> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.ticker] = r.value.data;
      });
      setHistorySeries(map);
    });
  }, [holdings, isPaid]);

  const { totalCurrentEUR, totalCostEUR } = calculatePortfolioTotals(
    holdings, cashEntries, quotes, exchangeRates, baseCurrency
  );

  const ttwror = calculateTTWROR(txs, totalCurrentEUR, totalCostEUR, exchangeRates, baseCurrency);
  const cashFlows = buildXIRRCashFlows(txs, totalCurrentEUR, exchangeRates, baseCurrency);
  const irr = cashFlows.length >= 2 ? calculateXIRR(cashFlows) : null;
  const simpleReturn = totalCostEUR > 0
    ? ((totalCurrentEUR - totalCostEUR) / totalCostEUR) * 100
    : 0;

  const { sharpe, maxDrawdown, volatility } = useMemo(() => {
    if (!isPaid || Object.keys(historySeries).length === 0) {
      return { sharpe: null, maxDrawdown: null, volatility: null };
    }

    // Build date-indexed portfolio values
    const allDates = new Set<string>();
    Object.values(historySeries).forEach((series) =>
      series.forEach((p) => allDates.add(p.date))
    );
    const sortedDates = [...allDates].sort();

    const entries = holdings
      .filter((h) => historySeries[h.ticker]?.length)
      .map((h) => ({ holding: h, series: historySeries[h.ticker] }));

    const values = sortedDates
      .map((date) => calculatePortfolioValueOnDate(entries, date, exchangeRates, baseCurrency))
      .filter((v) => v > 0);

    if (values.length < 2) return { sharpe: null, maxDrawdown: null, volatility: null };

    const dailyReturns = computeDailyReturns(values);
    return {
      sharpe: calculateSharpeRatio(dailyReturns, RISK_FREE_RATE_PCT),
      maxDrawdown: calculateMaxDrawdown(values),
      volatility: calculateAnnualizedVolatility(dailyReturns),
    };
  }, [isPaid, historySeries, holdings, exchangeRates, baseCurrency]);

  const proMetrics: MetricCard[] = [
    {
      label: t("sharpeRatio"),
      tooltip: t("sharpeRatioTooltip"),
      value: sharpe != null ? sharpe.toFixed(2) : null,
      isPro: false,
      metricKey: "sharpe",
    },
    {
      label: t("maxDrawdown"),
      tooltip: t("maxDrawdownTooltip"),
      value: maxDrawdown != null ? formatPercent(maxDrawdown) : null,
      isPro: false,
      metricKey: "drawdown",
    },
    {
      label: t("annualizedVolatility"),
      tooltip: t("volatilityTooltip"),
      value: volatility != null ? `${volatility.toFixed(1)}%` : null,
      isPro: false,
      metricKey: "volatility",
    },
  ];

  const hasTxData = txs.length > 0;

  return (
    <div className="card space-y-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">{t("portfolioPerformance")} <TierFeatureBadge requiredPlan="starter" size="sm" /></h3>

      {/* Free metrics (TTWROR + IRR) */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t("ttwror"), value: hasTxData ? ttwror : simpleReturn, tooltip: t("ttwrorFull") },
          { label: t("irr"), value: hasTxData ? irr : 0, tooltip: t("irrFull") },
        ].map((m) => {
          const hasValue = m.value !== null && m.value !== undefined;
          const isPositive = hasValue && (m.value as number) >= 0;
          const colorClass = !hasValue
            ? "text-gray-400 dark:text-slate-500"
            : isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400";
          return (
            <div key={m.label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">
                {m.label}
              </p>
              <p className={`text-xl font-bold ${colorClass}`} title={m.tooltip}>
                {hasValue ? `${(m.value as number) >= 0 ? "+" : ""}${(m.value as number).toFixed(2)}%` : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pro metrics */}
      {!isPaid ? (
        <BlurredProSection blurb="Upgrade to Bifolio for Sharpe Ratio, Max Drawdown, Volatility, and Beta." ctaLabel="Upgrade to Bifolio">
          <div className="grid grid-cols-3 gap-3">
            {["Sharpe Ratio", "Max Drawdown", "Volatility"].map((label) => (
              <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">{label}</p>
                <div className="h-7 w-16 rounded bg-gray-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </BlurredProSection>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {proMetrics.map((m) => {
            const isPositive = m.value != null && !m.value.startsWith("-");
            const colorClass = m.value == null
              ? "text-gray-400 dark:text-slate-500"
              : isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400";
            return (
              <button
                key={m.label}
                className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title={m.tooltip}
                onClick={() => track("metrics_lock_clicked", { metric: m.metricKey })}
              >
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">
                  {m.label}
                </p>
                <p className={`text-xl font-bold ${colorClass}`}>
                  {m.value ?? "—"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-slate-500">
        {t("financialDataDisclaimer")}
      </p>
    </div>
  );
}
