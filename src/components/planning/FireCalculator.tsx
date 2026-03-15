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
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import {
  calculateFireVariants,
  projectFirePath,
  savingsRate,
} from "@/lib/fire-calculations";
import type { FireParams, FireVariant, FireProjectionPoint } from "@/lib/fire-calculations";

const VARIANTS: { emoji: string; label: string }[] = [
  { emoji: "🪶", label: "Lean FIRE" },
  { emoji: "🔥", label: "Regular FIRE" },
  { emoji: "💎", label: "Fat FIRE" },
  { emoji: "🏖️", label: "Coast FIRE" },
  { emoji: "☕", label: "Barista FIRE" },
];

export default function FireCalculator() {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency,
  } = usePortfolio();

  const [annualIncome, setAnnualIncome] = useState(60000);
  const [annualExpenses, setAnnualExpenses] = useState(30000);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState(4);
  const [currentAge, setCurrentAge] = useState(32);
  const [targetAge, setTargetAge] = useState(50);

  const { totalCurrentEUR } = calculatePortfolioTotals(
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency
  );

  const fireParams: FireParams = useMemo(
    () => ({
      annualIncome,
      annualExpenses,
      currentPortfolioValue: totalCurrentEUR,
      expectedReturn: expectedReturn / 100,
      safeWithdrawalRate: safeWithdrawalRate / 100,
      currentAge,
    }),
    [
      annualIncome,
      annualExpenses,
      totalCurrentEUR,
      expectedReturn,
      safeWithdrawalRate,
      currentAge,
    ]
  );

  const variants = useMemo(() => calculateFireVariants(fireParams), [fireParams]);
  const rate = useMemo(
    () => savingsRate(annualIncome, annualExpenses),
    [annualIncome, annualExpenses]
  );

  const horizonYears = Math.max(0, targetAge - currentAge);
  const chartData = useMemo(
    () =>
      projectFirePath({ ...fireParams, horizonYears }).map((p: FireProjectionPoint) => ({
        ...p,
        ageLabel: String(Math.round(p.age)),
      })),
    [fireParams, horizonYears]
  );

  const fireNumber = useMemo(() => {
    const regular = variants.find((v) => v.label === "Regular FIRE");
    return regular?.fireNumber ?? 0;
  }, [variants]);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";
  const currency = activePortfolioCurrency;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-[340px] shrink-0 space-y-5">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Income & Expenses
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Annual Income
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={10000}
                  max={300000}
                  step={5000}
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-20 text-right">
                  {formatCompactNumber(annualIncome)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Annual Expenses
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={5000}
                  max={200000}
                  step={2500}
                  value={annualExpenses}
                  onChange={(e) => setAnnualExpenses(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-20 text-right">
                  {formatCompactNumber(annualExpenses)}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Savings Rate
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {(rate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Assumptions
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Expected Return
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={0.5}
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                  {expectedReturn}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Safe Withdrawal Rate
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={0.25}
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
                />
                <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                  {safeWithdrawalRate}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  Current Age
                </label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={currentAge}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) setCurrentAge(v);
                  }}
                  onBlur={() =>
                    setCurrentAge((v) => Math.min(100, Math.max(18, v)))
                  }
                  className="mt-1 w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  Target Age
                </label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={targetAge}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) setTargetAge(v);
                  }}
                  onBlur={() =>
                    setTargetAge((v) => Math.min(100, Math.max(18, v)))
                  }
                  className="mt-1 w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Portfolio
          </h3>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalCurrentEUR, currency)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Auto-filled from your portfolio
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {VARIANTS.map((v, i) => {
            const data = variants[i] as FireVariant | undefined;
            const isRegular = v.label === "Regular FIRE";
            return (
              <div
                key={v.label}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-4 ${
                  isRegular
                    ? "border-emerald-500 dark:border-emerald-500"
                    : "border-gray-200 dark:border-slate-700"
                }`}
              >
                <span className="text-xl" role="img" aria-hidden>
                  {v.emoji}
                </span>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-2">
                  {v.label}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {data
                    ? formatCompactNumber(data.fireNumber)
                    : "—"}
                </p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {data?.yearsToFire != null
                    ? `${data.yearsToFire} yrs`
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>

        {chartData.length > 0 && (
          <div
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5"
            role="img"
            aria-label="Projected path to FIRE"
          >
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
              Projected Path to FIRE
            </h3>
            <div style={{ aspectRatio: "2.5/1", minHeight: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="ageLabel"
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
                    formatter={(value: number | string | undefined) =>
                      formatCurrency(
                        typeof value === "number" ? value : Number(value),
                        currency
                      )
                    }
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#475569" : "#e5e7eb",
                      borderRadius: 8,
                      color: isDark ? "#f1f5f9" : "#0f172a",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#fireGrad)"
                    dot={false}
                  />
                  {fireNumber > 0 && (
                    <ReferenceLine
                      y={fireNumber}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      label={{
                        value: formatCompactNumber(fireNumber),
                        position: "right",
                        fill: "#ef4444",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
