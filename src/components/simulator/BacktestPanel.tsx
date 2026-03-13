"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import { simulateDCA, normalizeSeries } from "@/lib/backtest";
import type { BacktestResult, BacktestPoint } from "@/lib/backtest";
import type { HistoricalDataPoint } from "@/lib/types";
import SimulatorDisclaimer from "./SimulatorDisclaimer";

const PERIOD_OPTIONS = [
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
  { label: "10Y", value: "10y" },
  { label: "20Y", value: "20y" },
  { label: "Max", value: "max" },
] as const;

const BENCHMARKS = [
  { label: "None", value: "", symbol: "" },
  { label: "S&P 500 (SPY)", value: "spy", symbol: "^GSPC" },
  { label: "MSCI World (IWDA)", value: "msci", symbol: "IWDA.AS" },
  { label: "Euro Stoxx 50", value: "stoxx", symbol: "^STOXX50E" },
  { label: "Nasdaq 100", value: "nasdaq", symbol: "^IXIC" },
];

interface ChartPoint {
  date: string;
  asset: number;
  benchmark?: number;
  costBasis: number;
}

function formatDateLabel(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function BacktestPanel({ demoMode }: { demoMode?: boolean }) {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const { activePortfolioCurrency } = usePortfolio();
  const currency = activePortfolioCurrency || "EUR";

  const [ticker, setTicker] = useState("VWCE.DE");
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [period, setPeriod] = useState("5y");
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [benchmarkIdx, setBenchmarkIdx] = useState(1);
  const [chartMode, setChartMode] = useState<"value" | "percent">("value");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BacktestResult | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";

  // In demo mode, populate with sample backtest results
  useEffect(() => {
    if (!demoMode) return;
    const sampleSeries: BacktestPoint[] = [];
    const startYear = 2019;
    for (let m = 0; m < 60; m++) {
      const year = startYear + Math.floor(m / 12);
      const month = (m % 12) + 1;
      const date = `${year}-${String(month).padStart(2, "0")}-01`;
      const invested = 10000 + m * 500;
      const growth = Math.pow(1.008, m) * (1 + 0.05 * Math.sin(m / 6));
      sampleSeries.push({ date, value: Math.round(invested * growth), costBasis: invested });
    }
    const sampleResult: BacktestResult = {
      series: sampleSeries,
      totalInvested: 39500,
      finalValue: 52340,
      totalReturnPct: 32.5,
      cagr: 8.2,
      maxDrawdownPct: -18.4,
      sharpeRatio: 0.85,
      dividendIncome: 2150,
      bestYear: { year: 2021, returnPct: 24.3 },
      worstYear: { year: 2022, returnPct: -12.1 },
      yearlyReturns: [
        { year: 2019, returnPct: 10.5 },
        { year: 2020, returnPct: 15.8 },
        { year: 2021, returnPct: 24.3 },
        { year: 2022, returnPct: -12.1 },
        { year: 2023, returnPct: 8.9 },
      ],
    };
    setResult(sampleResult);
    const sampleChart: ChartPoint[] = sampleSeries.map((pt) => ({
      date: pt.date,
      asset: pt.value,
      costBasis: pt.costBasis,
    }));
    setChartData(sampleChart);
  }, [demoMode]);

  const runBacktest = useCallback(async () => {
    if (demoMode) return;
    setLoading(true);

    try {
      const periodParam =
        period === "max" ? "30y" : period;

      const [assetRes, benchmarkRes] = await Promise.all([
        fetch(`/api/historical?symbol=${encodeURIComponent(ticker)}&period=${periodParam}`),
        BENCHMARKS[benchmarkIdx].symbol
          ? fetch(`/api/historical?symbol=${encodeURIComponent(BENCHMARKS[benchmarkIdx].symbol)}&period=${periodParam}`)
          : Promise.resolve(null),
      ]);

      const assetData: { data?: HistoricalDataPoint[] } = await assetRes.json();
      const prices = assetData.data || [];

      if (prices.length === 0) {
        setResult(null);
        setChartData([]);
        setLoading(false);
        return;
      }

      const dividendYield = 0.02;
      const config = {
        initialInvestment,
        monthlyContribution,
        reinvestDividends,
        dividendYield,
      };

      const assetResult = simulateDCA(prices, config);
      setResult(assetResult);

      let bmResult: BacktestResult | null = null;
      if (benchmarkRes) {
        const bmData: { data?: HistoricalDataPoint[] } = await benchmarkRes.json();
        const bmPrices = bmData.data || [];
        if (bmPrices.length > 0) {
          bmResult = simulateDCA(bmPrices, config);
          setBenchmarkResult(bmResult);
        }
      }

      // Build chart data
      const points: ChartPoint[] = [];
      if (chartMode === "value") {
        for (let i = 0; i < assetResult.series.length; i++) {
          const pt = assetResult.series[i];
          const bmPt = bmResult?.series[i];
          points.push({
            date: pt.date,
            asset: Math.round(pt.value),
            benchmark: bmPt ? Math.round(bmPt.value) : undefined,
            costBasis: Math.round(pt.costBasis),
          });
        }
      } else {
        const assetValues = assetResult.series.map((p) => p.value);
        const normalized = normalizeSeries(assetValues);
        const bmNormalized = bmResult
          ? normalizeSeries(bmResult.series.map((p) => p.value))
          : [];
        const basisNormalized = normalizeSeries(
          assetResult.series.map((p) => p.costBasis)
        );

        for (let i = 0; i < assetResult.series.length; i++) {
          points.push({
            date: assetResult.series[i].date,
            asset: Math.round((normalized[i] ?? 0) * 10) / 10,
            benchmark: bmNormalized[i] != null ? Math.round(bmNormalized[i] * 10) / 10 : undefined,
            costBasis: Math.round((basisNormalized[i] ?? 0) * 10) / 10,
          });
        }
      }

      // Downsample for performance (max ~200 points for chart)
      const maxPoints = 200;
      if (points.length > maxPoints) {
        const step = Math.ceil(points.length / maxPoints);
        const sampled: ChartPoint[] = [];
        for (let i = 0; i < points.length; i += step) {
          sampled.push(points[i]);
        }
        if (sampled[sampled.length - 1] !== points[points.length - 1]) {
          sampled.push(points[points.length - 1]);
        }
        setChartData(sampled);
      } else {
        setChartData(points);
      }
    } catch {
      setResult(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [ticker, initialInvestment, monthlyContribution, period, reinvestDividends, benchmarkIdx, chartMode, demoMode]);

  const formatTooltipValue = (value: number) => {
    if (chartMode === "percent") return `${value.toFixed(1)}`;
    return formatCurrency(value, currency);
  };

  return (
    <div className="space-y-5">
      {/* Configuration Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {t("simulatorBacktestTitle")}
          </h2>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {t("simulatorDataSource")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ticker */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorAssetTicker")}
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="VWCE.DE"
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Initial Investment */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorInitialInvestment")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500">{currency}</span>
            </div>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorMonthlyContribution")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500">{currency}</span>
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorPeriod")}
            </label>
            <div className="flex flex-wrap gap-1">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    period === p.value
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reinvest Dividends */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorReinvestDividends")}
            </label>
            <button
              onClick={() => setReinvestDividends(!reinvestDividends)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300"
            >
              <div className={`w-9 h-5 rounded-full relative transition-colors ${reinvestDividends ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${reinvestDividends ? "left-[18px]" : "left-0.5"}`} />
              </div>
              {reinvestDividends ? t("simulatorYesReinvest") : t("simulatorNoReinvest")}
            </button>
          </div>

          {/* Benchmark */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {t("simulatorCompareWith")}
            </label>
            <select
              value={benchmarkIdx}
              onChange={(e) => setBenchmarkIdx(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              {BENCHMARKS.map((b, i) => (
                <option key={b.value} value={i}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={runBacktest}
            disabled={loading || !ticker}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {t("simulatorRunBacktest")}
          </button>
        </div>
      </div>

      {/* Chart */}
      {result && chartData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">
              {t("simulatorPerformance")} — {ticker}
              {BENCHMARKS[benchmarkIdx].value ? ` vs ${BENCHMARKS[benchmarkIdx].label}` : ""}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => { setChartMode("value"); runBacktest(); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "value" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                {t("value")}
              </button>
              <button
                onClick={() => { setChartMode("percent"); runBacktest(); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "percent" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                % {t("simulatorReturn")}
              </button>
            </div>
          </div>

          <div style={{ aspectRatio: "2.8/1", maxHeight: "min(320px, 45vh)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bt-asset" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="bt-benchmark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v: number) => chartMode === "value" ? formatCompactNumber(v) : `${v}`}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#fff",
                    border: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number | string | undefined, name?: string) => [
                    formatTooltipValue(typeof value === "number" ? value : Number(value || 0)),
                    name === "asset" ? ticker : name === "benchmark" ? BENCHMARKS[benchmarkIdx].label : t("simulatorCostBasis"),
                  ]}
                  labelFormatter={(label) => formatDateLabel(String(label))}
                />
                <ReferenceLine y={0} stroke={axisStroke} strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="costBasis"
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                />
                {benchmarkResult && (
                  <Area
                    type="monotone"
                    dataKey="benchmark"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fill="url(#bt-benchmark)"
                    dot={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="asset"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#bt-asset)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {ticker}
            </div>
            {benchmarkResult && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                {BENCHMARKS[benchmarkIdx].label}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-50" />
              {t("simulatorCostBasis")}
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label={t("simulatorTotalInvested")} value={formatCurrency(result.totalInvested, currency)} sub={`${formatCurrency(initialInvestment, currency)} + ${formatCurrency(monthlyContribution, currency)}/mo`} />
          <StatCard label={t("simulatorFinalValue")} value={formatCurrency(result.finalValue, currency)} valueClass={result.finalValue >= result.totalInvested ? "text-emerald-500" : "text-red-500"} sub={benchmarkResult ? `vs ${formatCurrency(benchmarkResult.finalValue, currency)}` : undefined} />
          <StatCard label={t("simulatorTotalReturn")} value={`${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`} valueClass={result.totalReturnPct >= 0 ? "text-emerald-500" : "text-red-500"} sub={benchmarkResult ? `vs ${benchmarkResult.totalReturnPct >= 0 ? "+" : ""}${benchmarkResult.totalReturnPct.toFixed(1)}%` : undefined} />
          <StatCard label={t("simulatorAnnualizedReturn")} value={`${result.cagr >= 0 ? "+" : ""}${result.cagr.toFixed(1)}%`} valueClass={result.cagr >= 0 ? "text-emerald-500" : "text-red-500"} sub={t("simulatorCagrLabel")} />
          <StatCard label={t("simulatorMaxDrawdown")} value={result.maxDrawdownPct != null ? `${result.maxDrawdownPct.toFixed(1)}%` : "—"} valueClass="text-red-500" />
          <StatCard label={t("simulatorSharpeRatio")} value={result.sharpeRatio != null ? result.sharpeRatio.toFixed(2) : "—"} sub={t("simulatorRiskAdjusted")} />
          <StatCard label={t("simulatorDividendIncome")} value={formatCurrency(result.dividendIncome, currency)} sub={reinvestDividends ? t("simulatorReinvested") : t("simulatorCashPaid")} />
          {result.bestYear && result.worstYear && (
            <StatCard
              label={t("simulatorBestWorstYear")}
              value={
                <span>
                  <span className="text-emerald-500">+{result.bestYear.returnPct.toFixed(1)}%</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-red-500">{result.worstYear.returnPct.toFixed(1)}%</span>
                </span>
              }
              sub={`${result.bestYear.year} / ${result.worstYear.year}`}
            />
          )}
        </div>
      )}

      <SimulatorDisclaimer />
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono tabular-nums ${valueClass || ""}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</div>
      )}
    </div>
  );
}
