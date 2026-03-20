"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import {
  calculateTTWROR,
  calculateXIRR,
  buildXIRRCashFlows,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateAnnualizedVolatility,
  computeDailyReturns,
  calculatePortfolioValueOnDate,
} from "@/lib/performance";
import {
  aggregatePerformanceBreakdown,
  calculateAnnualReturns,
  filterTransactionsByYear,
  type AnnualReturn,
  type PerformanceBreakdown,
} from "@/lib/performance-breakdown";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Transaction, Holding, CashEntry, HistoricalDataPoint } from "@/lib/types";
import TierFeatureBadge from "./TierFeatureBadge";
import DataUpgradeNudge from "./DataUpgradeNudge";

const BlurredProSection = dynamic(() => import("./BlurredProSection"), { ssr: false });

const RISK_FREE_RATE_PCT = 3.5;

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

type PeriodFilter = "all" | number;

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
}

const DEMO_SNAPSHOTS: SnapshotPoint[] = (() => {
  const pts: SnapshotPoint[] = [];
  const now = new Date();
  let val = 28000;
  let inv = 25000;
  for (let i = 900; i >= 0; i -= 7) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.random() - 0.45) * 600;
    val = Math.max(val + noise, inv * 0.6);
    if (i > 600 && Math.random() < 0.15) inv += 2000;
    pts.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(val * 100) / 100,
      invested: Math.round(inv * 100) / 100,
    });
  }
  return pts;
})();

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex ml-1">
      <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-slate-700 text-white text-[10px] leading-tight whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
        {text}
      </span>
    </span>
  );
}

function AnnualReturnChart({ data, onSelectYear, selectedYear }: {
  data: AnnualReturn[];
  onSelectYear: (year: PeriodFilter) => void;
  selectedYear: PeriodFilter;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    year: String(d.year),
    value: d.returnPct,
    positive: d.returnPct >= 0 ? d.returnPct : 0,
    negative: d.returnPct < 0 ? d.returnPct : 0,
  }));

  return (
    <div className="h-48 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-gray-400 dark:text-slate-500"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-gray-400 dark:text-slate-500"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
            formatter={(value) => {
              const v = Number(value) || 0;
              return [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "Return"];
            }}
            labelFormatter={(label) => String(label)}
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
          />
          <Bar
            dataKey="positive"
            stackId="stack"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(_entry, index) => {
              const d = chartData[index];
              if (d) onSelectYear(parseInt(d.year));
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`pos-${index}`}
                fill={selectedYear === parseInt(entry.year) ? "#059669" : "#10b981"}
                opacity={selectedYear !== "all" && selectedYear !== parseInt(entry.year) ? 0.4 : 1}
              />
            ))}
          </Bar>
          <Bar
            dataKey="negative"
            stackId="stack"
            radius={[0, 0, 4, 4]}
            cursor="pointer"
            onClick={(_entry, index) => {
              const d = chartData[index];
              if (d) onSelectYear(parseInt(d.year));
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`neg-${index}`}
                fill={selectedYear === parseInt(entry.year) ? "#dc2626" : "#ef4444"}
                opacity={selectedYear !== "all" && selectedYear !== parseInt(entry.year) ? 0.4 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformancePage({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const {
    holdings: ctxHoldings,
    cashEntries: ctxCashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency,
    activePortfolioId,
    demoMode,
  } = usePortfolio();
  const { user } = useAuth();
  const track = useTrack();

  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const baseCurrency = activePortfolioCurrency;
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [historySeries, setHistorySeries] = useState<Record<string, HistoricalDataPoint[]>>({});

  useEffect(() => {
    track("performance_page_viewed");
    if (demoMode) {
      setSnapshots(DEMO_SNAPSHOTS);
      return;
    }
    fetch("/api/transactions").then((r) => (r.ok ? r.json() : [])).then(setTxs);
    const pid = activePortfolioId ? `&portfolioId=${activePortfolioId}` : "";
    fetch(`/api/portfolio/history?range=all${pid}`)
      .then((r) => (r.ok ? r.json() : { points: [] }))
      .then((data) => setSnapshots(data.points ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolioId, demoMode]);

  useEffect(() => {
    if (!isPaid || demoMode) return;
    const tickers = holdings.map((h) => h.ticker).slice(0, 10);
    Promise.allSettled(
      tickers.map((ticker) =>
        fetch(`/api/historical?ticker=${encodeURIComponent(ticker)}&period=1y`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: HistoricalDataPoint[]) => ({ ticker, data })),
      ),
    ).then((results) => {
      const map: Record<string, HistoricalDataPoint[]> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.ticker] = r.value.data;
      });
      setHistorySeries(map);
    });
  }, [holdings, isPaid, demoMode]);

  const { totalCurrentEUR, totalCostEUR } = calculatePortfolioTotals(
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    baseCurrency,
  );

  const annualReturns = useMemo(
    () => calculateAnnualReturns(snapshots),
    [snapshots],
  );

  const yearTabs = useMemo(() => {
    const years = annualReturns.map((r) => r.year).sort((a, b) => b - a);
    return years;
  }, [annualReturns]);

  const activeTxs = useMemo(() => {
    if (selectedPeriod === "all") return txs;
    return filterTransactionsByYear(txs, selectedPeriod);
  }, [txs, selectedPeriod]);

  const hasTxData = txs.length > 0;

  const breakdown: PerformanceBreakdown = useMemo(
    () =>
      aggregatePerformanceBreakdown(activeTxs, totalCurrentEUR, totalCostEUR, exchangeRates, baseCurrency),
    [activeTxs, totalCurrentEUR, totalCostEUR, exchangeRates, baseCurrency],
  );

  const ttwror = calculateTTWROR(activeTxs, totalCurrentEUR, totalCostEUR, exchangeRates, baseCurrency);
  const cashFlows = buildXIRRCashFlows(activeTxs, totalCurrentEUR, exchangeRates, baseCurrency);
  const irr = cashFlows.length >= 2 ? calculateXIRR(cashFlows) : null;
  const simpleReturn = totalCostEUR > 0
    ? ((totalCurrentEUR - totalCostEUR) / totalCostEUR) * 100
    : 0;

  const { sharpe, maxDrawdown, volatility } = useMemo(() => {
    if (!isPaid || Object.keys(historySeries).length === 0) {
      return { sharpe: null, maxDrawdown: null, volatility: null };
    }
    const allDates = new Set<string>();
    Object.values(historySeries).forEach((series) =>
      series.forEach((p) => allDates.add(p.date)),
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

  function handlePeriodChange(period: PeriodFilter) {
    setSelectedPeriod(period);
    track("performance_period_changed", { period: String(period) });
  }

  const colorFor = (value: number) =>
    value >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";

  const arrowFor = (value: number) =>
    value >= 0 ? "\u2197" : "\u2198";

  if (!isPaid) {
    return (
      <div className="space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            {t("perfBreakdownTitle")}
            <TierFeatureBadge requiredPlan="starter" size="sm" />
          </h3>
          <BlurredProSection blurb={t("perfBreakdownUpgradeBlurb")} ctaLabel={t("perfBreakdownUpgradeCta")}>
            <div className="space-y-5">
              <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-xl" />
              <div className="space-y-3">
                {["TTWROR", "IRR", "Price Gain", "Dividends"].map((label) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">{label}</span>
                    <div className="h-5 w-20 rounded bg-gray-200 dark:bg-slate-700" />
                  </div>
                ))}
              </div>
            </div>
          </BlurredProSection>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            {t("perfBreakdownTitle")}
            <TierFeatureBadge requiredPlan="starter" size="sm" />
          </h3>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4" role="tablist" aria-label={t("perfBreakdownPeriod")}>
          <button
            role="tab"
            aria-selected={selectedPeriod === "all"}
            onClick={() => handlePeriodChange("all")}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedPeriod === "all"
                ? "bg-emerald-500 text-white"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            {t("perfBreakdownAllTime")}
          </button>
          {yearTabs.map((year) => (
            <button
              key={year}
              role="tab"
              aria-selected={selectedPeriod === year}
              onClick={() => handlePeriodChange(year)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedPeriod === year
                  ? "bg-emerald-500 text-white"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Bar Chart */}
        {annualReturns.length > 0 && (
          <AnnualReturnChart
            data={annualReturns}
            selectedYear={selectedPeriod}
            onSelectYear={handlePeriodChange}
          />
        )}

        {annualReturns.length === 0 && (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            {t("perfBreakdownNoHistory")}
          </div>
        )}
      </div>

      {/* Data quality nudge */}
      {!hasTxData && (
        <DataUpgradeNudge
          variant="emerald"
          titleKey="nudgePerfTitle"
          descKey="nudgePerfDesc"
          dismissKey="nudge_perf_page_dismissed"
          dismissMode="session"
        />
      )}

      {/* Capital */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          {t("perfBreakdownCapital")}
        </h4>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
            {t("perfBreakdownInvestedCapital")}
            <InfoTooltip text={t("perfBreakdownInvestedCapitalTip")} />
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(breakdown.investedCapital, baseCurrency)}
          </span>
        </div>
      </div>

      {/* Performance breakdown */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          {t("perfBreakdownSection")}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
              {t("perfBreakdownPriceGain")}
              <InfoTooltip text={t("perfBreakdownPriceGainTip")} />
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${colorFor(breakdown.priceGainPercent)}`}>
                {arrowFor(breakdown.priceGainPercent)}{Math.abs(breakdown.priceGainPercent).toFixed(2)}%
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.priceGain, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
              {t("perfBreakdownDividends")}
              <InfoTooltip text={t("perfBreakdownDividendsTip")} />
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${colorFor(breakdown.dividendPercent)}`}>
                {arrowFor(breakdown.dividendPercent)}{Math.abs(breakdown.dividendPercent).toFixed(2)}%
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.dividendIncome, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
              {t("perfBreakdownRealizedPL")}
              <InfoTooltip text={t("perfBreakdownRealizedPLTip")} />
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${colorFor(breakdown.realizedPLPercent)}`}>
                {arrowFor(breakdown.realizedPLPercent)}{Math.abs(breakdown.realizedPLPercent).toFixed(2)}%
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(breakdown.realizedPL, baseCurrency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction costs */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          {t("perfBreakdownCosts")}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {t("perfBreakdownTxCosts")}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              -{formatCurrency(breakdown.totalFees, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {t("perfBreakdownTaxes")}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              -{formatCurrency(breakdown.totalTaxes, baseCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Total return + TTWROR + XIRR */}
      <div className="card">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {t("perfBreakdownTotalReturn")}
            </span>
            <span className={`text-lg font-bold ${colorFor(breakdown.totalReturn)}`}>
              {arrowFor(breakdown.totalReturn)}{formatCurrency(Math.abs(breakdown.totalReturn), baseCurrency)}
            </span>
          </div>

          <hr className="border-gray-200 dark:border-slate-700" />

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
              {t("irr")}
              <InfoTooltip text={t("irrFull")} />
            </span>
            <span className={`text-sm font-bold ${colorFor(irr ?? 0)}`}>
              {irr != null
                ? `${arrowFor(irr)}${Math.abs(irr).toFixed(2)}%`
                : hasTxData
                  ? t("irrNeedsTime")
                  : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center">
              {t("ttwror")}
              <InfoTooltip text={t("ttwrorFull")} />
            </span>
            <span className={`text-sm font-bold ${colorFor(hasTxData ? ttwror : simpleReturn)}`}>
              {arrowFor(hasTxData ? ttwror : simpleReturn)}
              {Math.abs(hasTxData ? ttwror : simpleReturn).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Advanced metrics (Sharpe, Drawdown, Volatility) */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          {t("perfBreakdownAdvanced")}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("sharpeRatio"), tooltip: t("sharpeRatioTooltip"), value: sharpe != null ? sharpe.toFixed(2) : null },
            { label: t("maxDrawdown"), tooltip: t("maxDrawdownTooltip"), value: maxDrawdown != null ? formatPercent(maxDrawdown) : null },
            { label: t("annualizedVolatility"), tooltip: t("volatilityTooltip"), value: volatility != null ? `${volatility.toFixed(1)}%` : null },
          ].map((m) => (
            <div key={m.label} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3" title={m.tooltip}>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">
                {m.label}
              </p>
              <p className={`text-lg font-bold ${
                m.value == null
                  ? "text-gray-400 dark:text-slate-500"
                  : m.value.startsWith("-") || m.value.startsWith("+") 
                    ? (m.value.startsWith("-") ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")
                    : "text-gray-900 dark:text-white"
              }`}>
                {m.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">
        {t("financialDataDisclaimer")}
      </p>
    </div>
  );
}
