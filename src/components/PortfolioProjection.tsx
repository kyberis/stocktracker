"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatCompactNumber, convertToEUR } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import type { Holding, CashEntry } from "@/lib/types";

const HORIZON_OPTIONS = [10, 20, 30] as const;
type Horizon = (typeof HORIZON_OPTIONS)[number];

interface ProjectionPoint {
  year: number;
  label: string;
  base: number;
  withDividends: number;
  withContributions: number;
  goal?: number;
}

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function PortfolioProjection({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const track = useTrack();
  const {
    holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates,
    activePortfolioCurrency, activePortfolioId, goal: savedGoal, saveGoal, deleteGoal, demoMode,
  } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;

  const [goalName, setGoalName] = useState(savedGoal?.name ?? "My Goal");
  const [growthRate, setGrowthRate] = useState(savedGoal?.growthRate ?? 7);
  const [reinvestDividends, setReinvestDividends] = useState(savedGoal?.reinvestDividends ?? true);
  const [contributionAmount, setContributionAmount] = useState(() => {
    if (!savedGoal) return 0;
    return savedGoal.contributionMode === "monthly" ? Math.round(savedGoal.yearlyContribution / 12) : savedGoal.yearlyContribution;
  });
  const [contributionMode, setContributionMode] = useState<"monthly" | "yearly">(savedGoal?.contributionMode ?? "monthly");
  const [horizon, setHorizon] = useState<Horizon>(() => {
    const h = savedGoal?.horizon;
    if (h === 10 || h === 20 || h === 30) return h;
    return 20;
  });
  const [goalTarget, setGoalTarget] = useState(savedGoal?.targetAmount ?? 0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!savedGoal || initializedRef.current) return;
    initializedRef.current = true;
    setGoalName(savedGoal.name);
    setGrowthRate(savedGoal.growthRate);
    setReinvestDividends(savedGoal.reinvestDividends);
    setContributionMode(savedGoal.contributionMode);
    setContributionAmount(
      savedGoal.contributionMode === "monthly"
        ? Math.round(savedGoal.yearlyContribution / 12)
        : savedGoal.yearlyContribution
    );
    const h = savedGoal.horizon;
    if (h === 10 || h === 20 || h === 30) setHorizon(h);
    setGoalTarget(savedGoal.targetAmount);
  }, [savedGoal]);

  const yearlyContribution = contributionMode === "monthly" ? contributionAmount * 12 : contributionAmount;

  const hasUnsavedChanges = useMemo(() => {
    if (!savedGoal) return goalTarget > 0;
    return (
      goalTarget !== savedGoal.targetAmount ||
      goalName !== savedGoal.name ||
      growthRate !== savedGoal.growthRate ||
      reinvestDividends !== savedGoal.reinvestDividends ||
      yearlyContribution !== savedGoal.yearlyContribution ||
      contributionMode !== savedGoal.contributionMode ||
      horizon !== savedGoal.horizon
    );
  }, [savedGoal, goalTarget, goalName, growthRate, reinvestDividends, yearlyContribution, contributionMode, horizon]);

  const handleSave = useCallback(async () => {
    if (goalTarget <= 0 || saving) return;
    setSaving(true);
    await saveGoal({
      portfolioId: activePortfolioId ?? "",
      name: goalName.trim() || "My Goal",
      targetAmount: goalTarget,
      currency: baseCurrency,
      growthRate,
      yearlyContribution,
      contributionMode,
      reinvestDividends,
      horizon,
    });
    track(savedGoal ? "goal_updated" : "goal_saved", { target: String(goalTarget), horizon: String(horizon) });
    setSaving(false);
  }, [goalTarget, saving, saveGoal, activePortfolioId, goalName, baseCurrency, growthRate, yearlyContribution, contributionMode, reinvestDividends, horizon, track, savedGoal]);

  const handleDelete = useCallback(async () => {
    track("goal_removed");
    await deleteGoal();
    setGoalTarget(0);
    setGoalName("My Goal");
    initializedRef.current = false;
  }, [deleteGoal, track]);

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency]
  );

  const weightedDividendYield = useMemo(() => {
    let totalValueEUR = 0;
    let weightedYieldSum = 0;
    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (!q || !q.regularMarketPrice) continue;
      const cur = q.currency || h.displayCurrency || "USD";
      const valueEUR = convertToEUR(h.shares * q.regularMarketPrice, cur, exchangeRates);
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
    const points: ProjectionPoint[] = [{
      year: 0, label: String(thisYear),
      base: currentValue, withDividends: currentValue, withContributions: currentValue,
      ...(goalTarget > 0 ? { goal: goalTarget } : {}),
    }];
    let base = currentValue;
    let withDiv = currentValue;
    let withContrib = currentValue;
    for (let i = 1; i <= horizon; i++) {
      base = base * (1 + rate);
      const divIncome = withDiv * divYield;
      withDiv = (withDiv + (reinvestDividends ? divIncome : 0)) * (1 + rate);
      const divIncomeC = withContrib * divYield;
      withContrib = (withContrib + (reinvestDividends ? divIncomeC : 0)) * (1 + rate) + yearlyContribution;
      points.push({
        year: i, label: String(thisYear + i), base, withDividends: withDiv, withContributions: withContrib,
        ...(goalTarget > 0 ? { goal: goalTarget } : {}),
      });
    }
    return points;
  }, [totals.totalCurrentEUR, growthRate, weightedDividendYield, reinvestDividends, yearlyContribution, horizon, goalTarget]);

  const finalPoint = projectionData[projectionData.length - 1];
  const totalContributed = totals.totalCurrentEUR + yearlyContribution * horizon;
  const showDividendLine = reinvestDividends && weightedDividendYield > 0;
  const showContribLine = yearlyContribution > 0;
  const bestLine = showContribLine ? "withContributions" : showDividendLine ? "withDividends" : "base";

  const goalYearInfo = useMemo(() => {
    if (goalTarget <= 0 || totals.totalCurrentEUR <= 0) return null;

    if (totals.totalCurrentEUR >= goalTarget) {
      return { reached: true as const, withinHorizon: true, years: 0, months: 0 };
    }

    // Check within the chart data first
    for (let i = 1; i < projectionData.length; i++) {
      const prev = projectionData[i - 1][bestLine as keyof ProjectionPoint] as number;
      const curr = projectionData[i][bestLine as keyof ProjectionPoint] as number;
      if (curr >= goalTarget) {
        const fraction = prev < goalTarget ? (goalTarget - prev) / (curr - prev) : 0;
        const exactYears = (i - 1) + fraction;
        const years = Math.floor(exactYears);
        const months = Math.round((exactYears - years) * 12);
        return { reached: true as const, withinHorizon: true, years, months };
      }
    }

    // Extrapolate beyond the horizon to find the actual year
    const rate = growthRate / 100;
    const divYield = weightedDividendYield;
    let value = projectionData.length > 0
      ? (projectionData[projectionData.length - 1][bestLine as keyof ProjectionPoint] as number)
      : totals.totalCurrentEUR;
    const maxExtraYears = 200;

    for (let y = horizon + 1; y <= horizon + maxExtraYears; y++) {
      const divIncome = value * divYield;
      value = (value + (reinvestDividends ? divIncome : 0)) * (1 + rate) + yearlyContribution;
      if (value >= goalTarget) {
        const prevValue = (value - yearlyContribution) / (1 + rate) - (reinvestDividends ? (value - yearlyContribution) / (1 + rate) * divYield : 0);
        const fraction = prevValue < goalTarget ? (goalTarget - prevValue) / (value - prevValue) : 0;
        const exactYears = (y - 1) + fraction;
        const years = Math.floor(exactYears);
        const months = Math.round((exactYears - years) * 12);
        return { reached: true as const, withinHorizon: false, years, months };
      }
    }

    return { reached: false as const, withinHorizon: false, years: 0, months: 0 };
  }, [projectionData, goalTarget, bestLine, horizon, growthRate, weightedDividendYield, reinvestDividends, yearlyContribution, totals.totalCurrentEUR]);

  const goalProgress = goalTarget > 0 ? Math.min(100, (totals.totalCurrentEUR / goalTarget) * 100) : 0;

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";
  const currencySymbol = baseCurrency === "USD" ? "$" : baseCurrency === "GBP" ? "£" : "€";

  if (holdings.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("portfolioProjection")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("projNoHoldings")}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-5" id="goal-planner">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("portfolioProjection")}</h3>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && goalTarget > 0 && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {t("projUnsavedChanges")}
            </span>
          )}
          {goalTarget > 0 && !demoMode && (
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "..." : savedGoal ? t("projUpdateGoal") : t("projSaveGoal")}
            </button>
          )}
          {savedGoal && !demoMode && (
            <button
              onClick={handleDelete}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/30 transition-colors"
            >
              {t("projRemoveGoal")}
            </button>
          )}
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {isMinimized ? t("projectionExpand") : t("projectionMinimize")}
          </button>
        </div>
      </div>

      {isMinimized && (
        <p className="text-xs text-gray-500 dark:text-slate-400">{t("projectionMinimizedHint")}</p>
      )}

      {!isMinimized && (
        <div>
      {/* Goal target area */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label htmlFor="proj-goal-target" className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              {t("projGoalTarget")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">{currencySymbol}</span>
              <input
                id="proj-goal-target"
                type="number"
                min={0}
                step={10000}
                value={goalTarget || ""}
                onChange={(e) => setGoalTarget(Math.max(0, Number(e.target.value)))}
                placeholder="500,000"
                className="w-full pl-7 pr-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          {goalTarget > 0 && goalYearInfo && (
            <div className="text-right shrink-0">
              {goalYearInfo.reached && goalYearInfo.years === 0 && goalYearInfo.months === 0 ? (
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("goalBannerReached")}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {t("projGoalProgress").replace("{percent}", goalProgress.toFixed(0))}
                  </p>
                </div>
              ) : goalYearInfo.reached ? (
                <div>
                  <p className={`text-xs font-semibold ${goalYearInfo.withinHorizon ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {t("projGoalReachedExact").replace("{years}", String(goalYearInfo.years)).replace("{months}", String(goalYearInfo.months))}
                  </p>
                  {!goalYearInfo.withinHorizon && (yearlyContribution > 0 || reinvestDividends) && (
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                      {t("projGoalWithPlan")}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {t("projGoalProgress").replace("{percent}", goalProgress.toFixed(0))}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400">
                    {t("projGoalNotReached")}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {t("projGoalProgress").replace("{percent}", goalProgress.toFixed(0))}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {goalTarget > 0 && (
          <>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-emerald-400 to-emerald-500"
                style={{ width: `${Math.min(100, goalProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 dark:text-slate-500 font-medium px-0.5">
              <span className={goalProgress >= 25 ? "text-emerald-500" : ""}>25%</span>
              <span className={goalProgress >= 50 ? "text-emerald-500" : ""}>50%</span>
              <span className={goalProgress >= 75 ? "text-emerald-500" : ""}>75%</span>
              <span className={goalProgress >= 100 ? "text-emerald-500" : ""}>100%</span>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
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
            <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-12 text-right">{growthRate}%</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("projReinvestDividends")}</label>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setReinvestDividends(!reinvestDividends)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reinvestDividends ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reinvestDividends ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            {weightedDividendYield > 0 && (
              <span className="text-xs text-gray-400 dark:text-slate-500">{(weightedDividendYield * 100).toFixed(1)}% {t("projDividendYield").toLowerCase()}</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="proj-contribution" className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("projContribution")}</label>
            <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-slate-600">
              <button
                onClick={() => setContributionMode("monthly")}
                className={`px-1.5 py-0.5 text-[9px] font-medium transition-colors ${contributionMode === "monthly" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600"}`}
              >
                {t("projMonthly")}
              </button>
              <button
                onClick={() => setContributionMode("yearly")}
                className={`px-1.5 py-0.5 text-[9px] font-medium transition-colors ${contributionMode === "yearly" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600"}`}
              >
                {t("projYearly")}
              </button>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">{currencySymbol}</span>
            <input
              id="proj-contribution"
              type="number"
              min={0}
              step={contributionMode === "monthly" ? 50 : 500}
              value={contributionAmount}
              onChange={(e) => setContributionAmount(Math.max(0, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-1.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("projHorizon")}</label>
          <div className="flex gap-1.5">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${horizon === h ? "bg-emerald-500 text-white shadow-sm" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
              >
                {h} {t("projYears")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {projectionData.length > 0 && (
        <div className="mt-4" role="img" aria-label="Portfolio projection chart" style={{ aspectRatio: "2.8/1", maxHeight: "min(320px, 45vh)" }}>
        <ResponsiveContainer width="100%" height="100%">
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
            <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={{ stroke: axisStroke }} tickLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v: number) => `${formatCompactNumber(v)}`} tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                formatCurrency(typeof value === "number" ? value : Number(value), baseCurrency),
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
            <Area type="monotone" dataKey="base" name={t("projBaseGrowth")} stroke="#6b7280" strokeWidth={2} fill="url(#gradBase)" dot={false} />
            {showDividendLine && (
              <Area type="monotone" dataKey="withDividends" name={t("projWithDividends")} stroke="#8b5cf6" strokeWidth={2} fill="url(#gradDiv)" dot={false} />
            )}
            {showContribLine && (
              <Area type="monotone" dataKey="withContributions" name={t("projWithContributions")} stroke="#10b981" strokeWidth={2.5} fill="url(#gradContrib)" dot={false} />
            )}
            {goalTarget > 0 && (
              <ReferenceLine
                y={goalTarget}
                stroke={isDark ? "#f59e0b" : "#d97706"}
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{
                  value: `${t("projGoalLine")}: ${formatCompactNumber(goalTarget)}`,
                  position: "right",
                  fill: isDark ? "#fbbf24" : "#b45309",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        </div>
      )}

      {/* Summary cards */}
      {finalPoint && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase">{t("projCurrentValue")}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.totalCurrentEUR, baseCurrency)}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("projFinalValue")} ({horizon}{t("projYears").charAt(0)})</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(showContribLine ? finalPoint.withContributions : showDividendLine ? finalPoint.withDividends : finalPoint.base, baseCurrency)}
            </p>
          </div>
          <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("projTotalContributed")}</p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(totalContributed, baseCurrency)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">{t("projTotalReturn")}</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {(() => {
                const finalVal = showContribLine ? finalPoint.withContributions : showDividendLine ? finalPoint.withDividends : finalPoint.base;
                const pct = totalContributed > 0 ? ((finalVal - totalContributed) / totalContributed) * 100 : 0;
                return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
              })()}
            </p>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
