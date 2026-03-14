"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTheme } from "@/lib/theme-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import {
  projectRetirement,
  summarizeRetirement,
  monteCarloSimulation,
} from "@/lib/retirement-calculations";
import type {
  RetirementParams,
} from "@/lib/retirement-calculations";

interface ChartPoint {
  age: number;
  acc: number;
  dist: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

export default function RetirementProjection() {
  const { isDark } = useTheme();
  const {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
  } = usePortfolio();

  const [currentAge, setCurrentAge] = useState(32);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [preRetirementReturn, setPreRetirementReturn] = useState(7);
  const [postRetirementReturn, setPostRetirementReturn] = useState(4);
  const [inflationRate, setInflationRate] = useState(2);
  const [pensionMonthly, setPensionMonthly] = useState(800);
  const [showMonteCarlo, setShowMonteCarlo] = useState(true);

  const { totalCurrentEUR } = useMemo(
    () =>
      calculatePortfolioTotals(
        holdings,
        cashEntries,
        quotes,
        exchangeRates,
        "EUR"
      ),
    [holdings, cashEntries, quotes, exchangeRates]
  );

  const params: RetirementParams = useMemo(
    () => ({
      currentAge,
      retirementAge,
      lifeExpectancy,
      currentPortfolioValue: totalCurrentEUR,
      monthlyContribution,
      preRetirementReturn: preRetirementReturn / 100,
      postRetirementReturn: postRetirementReturn / 100,
      inflationRate: inflationRate / 100,
      annualPensionIncome: pensionMonthly * 12,
    }),
    [
      currentAge,
      retirementAge,
      lifeExpectancy,
      totalCurrentEUR,
      monthlyContribution,
      preRetirementReturn,
      postRetirementReturn,
      inflationRate,
      pensionMonthly,
    ]
  );

  const { projection, summary, monteCarlo } = useMemo(() => {
    const proj = projectRetirement(params);
    const sum = summarizeRetirement(params, proj);
    const mc = showMonteCarlo ? monteCarloSimulation(params, 500) : null;
    return { projection: proj, summary: sum, monteCarlo: mc };
  }, [params, showMonteCarlo]);

  const chartData = useMemo((): ChartPoint[] => {
    const points: ChartPoint[] = [];
    for (let i = 0; i < projection.length; i++) {
      const p = projection[i];
      const acc = p.age <= retirementAge ? p.nominalValue : 0;
      const dist = p.age >= retirementAge ? p.nominalValue : 0;
      const base: ChartPoint = {
        age: p.age,
        acc,
        dist,
        median: p.nominalValue,
        p10: 0,
        p25: 0,
        p75: 0,
        p90: 0,
      };
      if (monteCarlo) {
        base.p10 = monteCarlo.p10[i] ?? 0;
        base.p25 = monteCarlo.p25[i] ?? 0;
        base.p75 = monteCarlo.p75[i] ?? 0;
        base.p90 = monteCarlo.p90[i] ?? 0;
      }
      points.push(base);
    }
    return points;
  }, [projection, retirementAge, monteCarlo]);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";
  const chartBg = isDark ? "#1e293b" : "#ffffff";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-[340px] shrink-0 space-y-5">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Timeline
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Current age
              </label>
              <input
                type="number"
                min={18}
                max={100}
                value={currentAge}
                onChange={(e) =>
                  setCurrentAge(Math.min(100, Math.max(18, Number(e.target.value))))
                }
                className="mt-1 w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Retirement age
              </label>
              <input
                type="number"
                min={18}
                max={100}
                value={retirementAge}
                onChange={(e) =>
                  setRetirementAge(Math.min(100, Math.max(18, Number(e.target.value))))
                }
                className="mt-1 w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Life expectancy
              </label>
              <input
                type="number"
                min={50}
                max={120}
                value={lifeExpectancy}
                onChange={(e) =>
                  setLifeExpectancy(Math.min(120, Math.max(50, Number(e.target.value))))
                }
                className="mt-1 w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Pre-Retirement
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Monthly contribution (€)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={monthlyContribution}
                  onChange={(e) =>
                    setMonthlyContribution(Number(e.target.value))
                  }
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-16 text-right">
                  €{monthlyContribution}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Expected return (%)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={0.5}
                  value={preRetirementReturn}
                  onChange={(e) =>
                    setPreRetirementReturn(Number(e.target.value))
                  }
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                  {preRetirementReturn}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Post-Retirement
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Expected return (%)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={postRetirementReturn}
                  onChange={(e) =>
                    setPostRetirementReturn(Number(e.target.value))
                  }
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                  {postRetirementReturn}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Inflation rate (%)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={0.5}
                  value={inflationRate}
                  onChange={(e) =>
                    setInflationRate(Number(e.target.value))
                  }
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                  {inflationRate}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                Pension (€/mo)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={pensionMonthly}
                onChange={(e) =>
                  setPensionMonthly(Math.max(0, Number(e.target.value)))
                }
                className="mt-1 w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Monte Carlo
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMonteCarlo(!showMonteCarlo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showMonteCarlo
                  ? "bg-emerald-500"
                  : "bg-gray-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showMonteCarlo ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600 dark:text-slate-300">
              Show confidence bands
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Simulates 500 market scenarios to show the range of possible
            outcomes. Bands show 10–90th and 25–75th percentiles.
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 dark:from-emerald-500/15 dark:to-emerald-600/5 border border-emerald-200/50 dark:border-emerald-500/20 p-5">
            <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
              Accumulation Phase ({currentAge} → {retirementAge})
            </h3>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
              {formatCurrency(summary.peakValue, "EUR")}
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              Peak portfolio at age {summary.peakAge}
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
              Contributing €{monthlyContribution}/mo at {preRetirementReturn}%
              expected return
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 dark:from-orange-500/15 dark:to-orange-600/5 border border-orange-200/50 dark:border-orange-500/20 p-5">
            <h3 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">
              Distribution Phase ({retirementAge} → {lifeExpectancy})
            </h3>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
              {formatCurrency(summary.sustainableMonthlyWithdrawal, "EUR")}/mo
            </p>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
              Sustainable withdrawal + pension
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
              {postRetirementReturn}% return, {inflationRate}% inflation
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Retirement Projection
          </h3>
          <div
            role="img"
            aria-label="Retirement projection chart"
            style={{
              aspectRatio: "2.8/1",
              maxHeight: "min(320px, 45vh)",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="ret-acc"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#10b981"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="#10b981"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="ret-dist"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#f97316"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="#f97316"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="age"
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCompactNumber(v)}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    formatCurrency(
                      typeof value === "number" ? value : Number(value),
                      "EUR"
                    ),
                  ]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderColor: isDark ? "#475569" : "#e5e7eb",
                    borderRadius: 8,
                    color: isDark ? "#f1f5f9" : "#0f172a",
                  }}
                />
                {showMonteCarlo && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="p90"
                      fill="rgba(16,185,129,0.12)"
                      stroke="none"
                      dot={false}
                      name="10–90th percentile"
                    />
                    <Area
                      type="monotone"
                      dataKey="p10"
                      fill={chartBg}
                      stroke="none"
                      dot={false}
                      hide
                    />
                    <Area
                      type="monotone"
                      dataKey="p75"
                      fill="rgba(16,185,129,0.18)"
                      stroke="none"
                      dot={false}
                      name="25–75th percentile"
                    />
                    <Area
                      type="monotone"
                      dataKey="p25"
                      fill={chartBg}
                      stroke="none"
                      dot={false}
                      hide
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="acc"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#ret-acc)"
                  dot={false}
                  name="Median"
                />
                <Area
                  type="monotone"
                  dataKey="dist"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#ret-dist)"
                  dot={false}
                  name="Distribution phase"
                />
                <ReferenceLine
                  x={retirementAge}
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className={`rounded-xl p-5 ${
            summary.runsOutOfMoney
              ? "bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20"
          }`}
        >
          {summary.runsOutOfMoney ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              ⚠️ Warning: portfolio depleted at age {summary.depletionAge}
            </p>
          ) : (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              ✅ You&apos;re on track to retire at {retirementAge} with{" "}
              {formatCurrency(summary.sustainableMonthlyWithdrawal, "EUR")}/mo
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2">
            Income replacement:{" "}
            {(summary.incomeReplacement * 100).toFixed(0)}% of current
            contribution. Total monthly income:{" "}
            {formatCurrency(summary.sustainableMonthlyWithdrawal, "EUR")} (with
            pension).
          </p>
        </div>
      </main>
    </div>
  );
}
