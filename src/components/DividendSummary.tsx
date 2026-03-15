"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatStealthCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";
import { useTrack } from "@/lib/use-track";
import { useStealthMode } from "@/lib/stealth-context";
import { useTheme } from "@/lib/theme-context";
import {
  filterDividendTransactions,
  filterSellTransactions,
  computeEstimatedDividends,
  computeTotalEstimatedEUR,
  computeEstimatedYield,
  computeYearlyBreakdown,
  computeMonthlyCalendar,
  computeTopPayers,
  computeDividendProjections,
  computeEstimatedProjections,
  computeIncomeByMonth,
  computePortfolioYieldOnCost,
  computeDripSimulation,
} from "@/lib/services/dividend-calculator";

const ExDividendCalendar = dynamic(() => import("./ExDividendCalendar"), { ssr: false });

export default function DividendSummary() {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const [txs, setTxs] = useState<Transaction[]>([]);
  const track = useTrack();
  const { stealthMode } = useStealthMode();
  const { isDark } = useTheme();

  const [dripGrowthRate, setDripGrowthRate] = useState(5);
  const [dripYears, setDripYears] = useState(10);

  useEffect(() => {
    track("exdiv_calendar_viewed");
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dividendTxs = useMemo(() => filterDividendTransactions(txs), [txs]);
  const totalDividends = useMemo(() => dividendTxs.reduce((s, tx) => s + tx.totalAmount, 0), [dividendTxs]);

  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;

  const annualDividends = useMemo(
    () => dividendTxs.filter((tx) => tx.date.startsWith(String(thisYear))).reduce((s, tx) => s + tx.totalAmount, 0),
    [dividendTxs, thisYear]
  );

  const totalPortfolioValue = useMemo(
    () => holdings.reduce((s, h) => {
      const q = quotes[h.ticker];
      return s + (q ? h.shares * q.regularMarketPrice : 0);
    }, 0),
    [holdings, quotes]
  );
  const yieldPercent = totalPortfolioValue > 0 ? (annualDividends / totalPortfolioValue) * 100 : 0;

  const estimated = useMemo(
    () => computeEstimatedDividends(holdings, quotes, exchangeRates),
    [holdings, quotes, exchangeRates]
  );

  const totalEstimatedEUR = useMemo(() => computeTotalEstimatedEUR(estimated), [estimated]);

  const estimatedYieldPercent = useMemo(
    () => computeEstimatedYield(holdings, quotes, exchangeRates, totalEstimatedEUR),
    [holdings, quotes, exchangeRates, totalEstimatedEUR]
  );

  const portfolioYoc = useMemo(
    () => computePortfolioYieldOnCost(holdings, quotes, exchangeRates),
    [holdings, quotes, exchangeRates]
  );

  const byYear = useMemo(() => computeYearlyBreakdown(dividendTxs), [dividendTxs]);
  const byMonth = useMemo(() => computeMonthlyCalendar(dividendTxs), [dividendTxs]);
  const topDividendPayers = useMemo(() => computeTopPayers(dividendTxs), [dividendTxs]);

  const projections = useMemo(
    () => computeDividendProjections(byYear, thisYear, thisMonth),
    [byYear, thisYear, thisMonth]
  );

  const estimatedProjections = useMemo(
    () => computeEstimatedProjections(dividendTxs.length > 0, totalEstimatedEUR, thisYear),
    [dividendTxs.length, totalEstimatedEUR, thisYear]
  );

  const dripData = useMemo(
    () => computeDripSimulation(holdings, quotes, exchangeRates, dripGrowthRate / 100, dripYears),
    [holdings, quotes, exchangeRates, dripGrowthRate, dripYears]
  );

  const sellTxs = useMemo(() => filterSellTransactions(txs), [txs]);
  const incomeByMonth = useMemo(
    () => computeIncomeByMonth(dividendTxs, sellTxs, exchangeRates),
    [dividendTxs, sellTxs, exchangeRates]
  );

  const hasDividendTxs = dividendTxs.length > 0;
  const hasEstimatedDividends = estimated.length > 0;
  const hasIncomeData = incomeByMonth.some((m) => m.total > 0);
  const maxIncomeBar = Math.max(...incomeByMonth.map((m) => m.total), 1);

  if (!hasDividendTxs && !hasEstimatedDividends) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("dividends")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noDividends")}</p>
      </div>
    );
  }

  const maxBarAmount = projections.length > 0
    ? Math.max(...projections.map((r) => r.amount), 1)
    : Math.max(...estimatedProjections.map((r) => r.amount), 1);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";

  return (
    <div className="space-y-6">
      {/* ── Estimated dividend income from holdings ── */}
      {hasEstimatedDividends && (
        <>
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {hasDividendTxs ? t("estimatedDividendIncome") : t("dividends")}
              </h3>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {t("estimatedLabel")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("estAnnualIncome")}</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300"
                  aria-label={stealthMode ? formatCurrency(totalEstimatedEUR, baseCurrency) : undefined}>
                  {formatStealthCurrency(totalEstimatedEUR, baseCurrency, stealthMode)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("estMonthlyIncome")}</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300"
                  aria-label={stealthMode ? formatCurrency(totalEstimatedEUR / 12, baseCurrency) : undefined}>
                  {formatStealthCurrency(totalEstimatedEUR / 12, baseCurrency, stealthMode)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">{t("dividendYield")}</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{estimatedYieldPercent.toFixed(2)}%</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center" title={t("yieldOnCostTooltip")}>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase">{t("yieldOnCost")}</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {portfolioYoc > 0 ? `${portfolioYoc.toFixed(2)}%` : "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Per-stock breakdown with YOC column */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendByStock")}</p>
            <div className="space-y-1.5">
              {estimated.map((e, i) => (
                <div key={e.ticker} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-gray-700 dark:text-slate-300 flex-1 min-w-0">
                    <span className="text-gray-400 dark:text-slate-500 mr-1.5">{i + 1}.</span>
                    <span className="font-mono font-medium">{e.ticker}</span>
                    <span className="text-gray-400 dark:text-slate-500 ml-1.5">
                      {e.dividendYield > 0 ? `${e.dividendYield.toFixed(1)}%` : ""}
                    </span>
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] w-14 text-right shrink-0" title={t("yieldOnCost")}>
                    {e.yieldOnCost > 0 ? `${e.yieldOnCost.toFixed(1)}%` : "--"}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.min(100, (e.annualIncomeEUR / Math.max(estimated[0]?.annualIncomeEUR || 1, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-900 dark:text-white w-20 text-right"
                      aria-label={stealthMode ? formatCurrency(e.annualIncomeEUR, baseCurrency) : undefined}>
                      {formatStealthCurrency(e.annualIncomeEUR, baseCurrency, stealthMode)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">{t("yoc")}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">= {t("yieldOnCostTooltip")}</span>
            </div>
          </div>

          {/* Estimated projections */}
          {estimatedProjections.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("dividendProjection")}</p>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {t("basedOnGrowthAssumption")}
                </span>
              </div>
              <div className="space-y-1.5">
                {estimatedProjections.map(({ year, amount, isProjection }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${isProjection ? "text-indigo-500 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isProjection ? "bg-indigo-400 dark:bg-indigo-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-mono w-20 text-right ${isProjection ? "text-indigo-600 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                      {formatCurrency(amount, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Recorded dividend history (transactions) ── */}
      {hasDividendTxs && (
        <>
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {hasEstimatedDividends ? t("recordedDividends") : t("dividends")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("totalDividends")}</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(totalDividends, baseCurrency)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("annualDividendIncome")}</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(annualDividends, baseCurrency)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">{t("dividendYield")}</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{yieldPercent.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {/* Yearly income + Top payers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("yearlyDividendIncome")}</p>
              <div className="space-y-1.5">
                {byYear.map(({ year, amount }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${year === thisYear ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-slate-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${year === thisYear ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-gray-900 dark:text-white w-20 text-right">{formatCurrency(amount, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendIncome")} by Stock</p>
              <div className="space-y-1.5">
                {topDividendPayers.map(([ticker, amount], i) => (
                  <div key={ticker} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-slate-300">
                      <span className="text-gray-400 dark:text-slate-500 mr-1.5">{i + 1}.</span>
                      <span className="font-mono font-medium">{ticker}</span>
                    </span>
                    <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(amount, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dividend Projection */}
          {projections.some((r) => r.isProjection) && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("dividendProjection")}</p>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {t("basedOnGrowthAssumption")}
                </span>
              </div>
              <div className="space-y-1.5">
                {projections.map(({ year, amount, isProjection }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${isProjection ? "text-indigo-500 dark:text-indigo-400" : year === thisYear ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-slate-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isProjection ? "bg-indigo-400 dark:bg-indigo-500" : year === thisYear ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-mono w-20 text-right ${isProjection ? "text-indigo-600 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                      {formatCurrency(amount, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly calendar */}
          {byMonth.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendCalendar")}</p>
              <div className="space-y-1">
                {byMonth.map(([month, amount]) => (
                  <div key={month} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-slate-400">{month}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.min(100, (amount / Math.max(...byMonth.map((m) => m[1]))) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-900 dark:text-white w-16 text-right">{formatCurrency(amount, baseCurrency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DRIP Simulation ── */}
      {dripData.length > 0 && (
        <div className="card space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("dripSimulation")}</h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{t("dripSimulationDesc")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
              <span className="font-medium">{t("dripGrowthRate")}</span>
              <select
                value={dripGrowthRate}
                onChange={(e) => setDripGrowthRate(Number(e.target.value))}
                className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-gray-900 dark:text-white"
              >
                {[0, 2, 3, 5, 7, 10, 15].map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
              <span className="font-medium">{t("dripYears")}</span>
              <select
                value={dripYears}
                onChange={(e) => setDripYears(Number(e.target.value))}
                className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-gray-900 dark:text-white"
              >
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dripData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="dripWithGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dripWithoutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                  tickFormatter={(y: number) => `Yr ${y}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v, baseCurrency)}
                  width={72}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#fff",
                    border: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(value: number | string | undefined, name: string | undefined) => [
                    formatCurrency(typeof value === "number" ? value : Number(value), baseCurrency),
                    name || "",
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="withDrip"
                  name={t("withDrip")}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#dripWithGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="withoutDrip"
                  name={t("withoutDrip")}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  fill="url(#dripWithoutGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {dripData.length > 1 && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("withDrip")} (Yr {dripYears})</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300"
                  aria-label={stealthMode ? formatCurrency(dripData[dripData.length - 1].withDrip, baseCurrency) : undefined}>
                  {formatStealthCurrency(dripData[dripData.length - 1].withDrip, baseCurrency, stealthMode)}
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium uppercase">{t("withoutDrip")} (Yr {dripYears})</p>
                <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300"
                  aria-label={stealthMode ? formatCurrency(dripData[dripData.length - 1].withoutDrip, baseCurrency) : undefined}>
                  {formatStealthCurrency(dripData[dripData.length - 1].withoutDrip, baseCurrency, stealthMode)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Ex-Dividend Calendar ── */}
      <Suspense fallback={null}>
        <ExDividendCalendar />
      </Suspense>

      {/* ── Income sub-view: dividends vs. capital gains (last 12 months) ── */}
      {hasIncomeData && (
        <div className="card" aria-label={t("incomeSubviewLabel")}>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs font-semibold text-gray-900 dark:text-white flex-1">{t("incomeSubviewLabel")}</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-violet-500" />{t("dividends")}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />{t("incomeCapitalGains")}</span>
            </div>
          </div>
          <div className="space-y-1.5" role="img" aria-label={`${t("incomeSubviewLabel")}: ${t("last12Months")}`}>
            {incomeByMonth.map(({ month, dividends, gains }) => {
              const divWidth = maxIncomeBar > 0 ? Math.min(100, (dividends / maxIncomeBar) * 100) : 0;
              const gainWidth = maxIncomeBar > 0 ? Math.min(100, (gains / maxIncomeBar) * 100) : 0;
              return (
                <div key={month} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 dark:text-slate-400 w-14 shrink-0">{month.slice(0, 7)}</span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    {dividends > 0 && (
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${divWidth}%` }} />
                      </div>
                    )}
                    {gains > 0 && (
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gainWidth}%` }} />
                      </div>
                    )}
                    {dividends === 0 && gains === 0 && (
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full" />
                    )}
                  </div>
                  <span className="font-mono text-gray-900 dark:text-white w-20 text-right shrink-0">
                    {formatCurrency(dividends + gains, baseCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
