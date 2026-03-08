"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import ProCompareCard from "@/components/ProCompareCard";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";

const HORIZON_OPTIONS = [10, 20, 30] as const;
type Horizon = (typeof HORIZON_OPTIONS)[number];

interface ProjectionPoint {
  year: number;
  label: string;
  base: number;
  withDividends: number;
  withContributions: number;
}

import type { Holding, CashEntry } from "@/lib/types";

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PortfolioProjection({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;

  const [growthRate, setGrowthRate] = useState(7);
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [yearlyContribution, setYearlyContribution] = useState(0);
  const [horizon, setHorizon] = useState<Horizon>(20);
  const [isMinimized, setIsMinimized] = useState(false);

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates),
    [holdings, cashEntries, quotes, exchangeRates]
  );

  const weightedDividendYield = useMemo(() => {
    let totalValueEUR = 0;
    let weightedYieldSum = 0;

    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (!q || !q.regularMarketPrice) continue;

      const cur = q.currency || h.displayCurrency || "USD";
      const rateToEUR =
        cur === "EUR"
          ? 1
          : exchangeRates[`${cur}_EUR`] ||
            1 / (exchangeRates[`EUR_${cur}`] || 1);
      const valueEUR = h.shares * q.regularMarketPrice * rateToEUR;
      const yld = q.trailingAnnualDividendYield ?? 0;

      totalValueEUR += valueEUR;
      weightedYieldSum += valueEUR * yld;
    }

    return totalValueEUR > 0 ? weightedYieldSum / totalValueEUR : 0;
  }, [holdings, quotes, exchangeRates]);

  const projectionData = useMemo(() => {
    const currentValue = totals.totalCurrentEUR;
    if (currentValue <= 0) return [];

    const rate = growthRate / 100;
    const divYield = weightedDividendYield;
    const thisYear = new Date().getFullYear();

    const points: ProjectionPoint[] = [
      {
        year: 0,
        label: String(thisYear),
        base: currentValue,
        withDividends: currentValue,
        withContributions: currentValue,
      },
    ];

    let base = currentValue;
    let withDiv = currentValue;
    let withContrib = currentValue;

    for (let i = 1; i <= horizon; i++) {
      base = base * (1 + rate);

      const divIncome = withDiv * divYield;
      withDiv = (withDiv + (reinvestDividends ? divIncome : 0)) * (1 + rate);

      const divIncomeC = withContrib * divYield;
      withContrib =
        (withContrib + (reinvestDividends ? divIncomeC : 0)) * (1 + rate) +
        yearlyContribution;

      points.push({
        year: i,
        label: String(thisYear + i),
        base,
        withDividends: withDiv,
        withContributions: withContrib,
      });
    }

    return points;
  }, [totals.totalCurrentEUR, growthRate, weightedDividendYield, reinvestDividends, yearlyContribution, horizon]);

  const finalPoint = projectionData[projectionData.length - 1];
  const totalContributed = totals.totalCurrentEUR + yearlyContribution * horizon;

  const showDividendLine = reinvestDividends && weightedDividendYield > 0;
  const showContribLine = yearlyContribution > 0;

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";
  const isPro = user?.plan === "pro";

  if (holdings.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          {t("portfolioProjection")}
        </h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">
          {t("projNoHoldings")}
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("portfolioProjection")}
        </h3>
        <button
          onClick={() => setIsMinimized((prev) => !prev)}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          {isMinimized ? t("projectionExpand") : t("projectionMinimize")}
        </button>
      </div>

      {isMinimized && (
        <p className="text-xs text-gray-500 dark:text-slate-400">{t("projectionMinimizedHint")}</p>
      )}

      {!isMinimized && (
        <div className="relative">
          {!isPro && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
              <div className="w-full max-w-xl">
                <ProCompareCard
                  surface="dashboard_projection_locked"
                  reason="upgrade_required"
                  compact
                />
              </div>
            </div>
          )}

          <div className={!isPro ? "blur-sm pointer-events-none select-none" : ""}>
      {/* Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Growth rate */}
        <div className="space-y-1.5">
          <label htmlFor="proj-growth-rate" className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("projGrowthRate")}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="proj-growth-rate"
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={growthRate}
              onChange={(e) => setGrowthRate(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-slate-600 accent-emerald-500"
            />
            <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">
              {growthRate}%
            </span>
          </div>
        </div>

        {/* Reinvest dividends */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("projReinvestDividends")}
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setReinvestDividends(!reinvestDividends)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                reinvestDividends ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  reinvestDividends ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            {weightedDividendYield > 0 && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {(weightedDividendYield * 100).toFixed(1)}% {t("projDividendYield").toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Yearly contribution */}
        <div className="space-y-1.5">
          <label htmlFor="proj-yearly-contribution" className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("projYearlyContribution")}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">
              €
            </span>
            <input
              id="proj-yearly-contribution"
              type="number"
              min={0}
              step={500}
              value={yearlyContribution}
              onChange={(e) => setYearlyContribution(Math.max(0, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Horizon */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {t("projHorizon")}
          </label>
          <div className="flex gap-1.5">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  horizon === h
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
              >
                {h} {t("projYears")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {projectionData.length > 0 && (
        <div role="img" aria-label="Portfolio projection chart">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={projectionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={{ stroke: axisStroke }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => `€${formatCompactNumber(v)}`}
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                formatCurrency(typeof value === "number" ? value : Number(value), "EUR"),
                name || t("value"),
              ]}
              labelFormatter={(label) => `${t("projYear")} ${label}`}
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderColor: isDark ? "#475569" : "#e5e7eb",
                borderRadius: 8,
                color: isDark ? "#f1f5f9" : "#0f172a",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="base"
              name={t("projBaseGrowth")}
              stroke="#6b7280"
              strokeWidth={2}
              fill="url(#gradBase)"
              dot={false}
            />
            {showDividendLine && (
              <Area
                type="monotone"
                dataKey="withDividends"
                name={t("projWithDividends")}
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#gradDiv)"
                dot={false}
              />
            )}
            {showContribLine && (
              <Area
                type="monotone"
                dataKey="withContributions"
                name={t("projWithContributions")}
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#gradContrib)"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        </div>
      )}

      {/* Summary cards */}
      {finalPoint && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase">
              {t("projCurrentValue")}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(totals.totalCurrentEUR, "EUR")}
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">
              {t("projFinalValue")} ({horizon}{t("projYears").charAt(0)})
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(
                showContribLine
                  ? finalPoint.withContributions
                  : showDividendLine
                    ? finalPoint.withDividends
                    : finalPoint.base,
                "EUR"
              )}
            </p>
          </div>
          <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">
              {t("projTotalContributed")}
            </p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
              {formatCurrency(totalContributed, "EUR")}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">
              {t("projTotalReturn")}
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {(() => {
                const finalVal = showContribLine
                  ? finalPoint.withContributions
                  : showDividendLine
                    ? finalPoint.withDividends
                    : finalPoint.base;
                const pct = totalContributed > 0 ? ((finalVal - totalContributed) / totalContributed) * 100 : 0;
                return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
              })()}
            </p>
          </div>
        </div>
      )}
          </div>
        </div>
      )}
    </div>
  );
}
