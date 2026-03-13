"use client";

import { useMemo, useState } from "react";
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
import { convertToEUR, formatCurrency } from "@/lib/utils";
import { CRISIS_SCENARIOS } from "@/lib/crisis-scenarios";
import type { CrisisScenario } from "@/lib/crisis-scenarios";
import { computeStressTest } from "@/lib/backtest";
import type { StressTestResult } from "@/lib/backtest";
import SimulatorDisclaimer from "./SimulatorDisclaimer";

interface CrisisChartPoint {
  step: number;
  label: string;
  portfolio: number;
  benchmark: number;
}

function buildCrisisChart(
  drawdown: number,
  benchmarkDrawdown: number,
  durationMonths: number,
  recoveryYears: number
): CrisisChartPoint[] {
  const points: CrisisChartPoint[] = [];
  const totalSteps = 20;
  const crashSteps = Math.max(Math.round(totalSteps * 0.3), 3);
  const recoverySteps = totalSteps - crashSteps;

  for (let i = 0; i <= crashSteps; i++) {
    const frac = i / crashSteps;
    points.push({
      step: i,
      label: `M${Math.round(frac * durationMonths)}`,
      portfolio: Math.round((100 - drawdown * 100 * frac) * 10) / 10,
      benchmark: Math.round((100 - benchmarkDrawdown * 100 * frac) * 10) / 10,
    });
  }

  const portfolioTrough = 100 - drawdown * 100;
  const benchmarkTrough = 100 - benchmarkDrawdown * 100;

  for (let i = 1; i <= recoverySteps; i++) {
    const frac = i / recoverySteps;
    const recoveryProgress = Math.pow(frac, 0.7);
    points.push({
      step: crashSteps + i,
      label: `+${Math.round(frac * recoveryYears)}Y`,
      portfolio: Math.round((portfolioTrough + (100 - portfolioTrough) * recoveryProgress * 0.9) * 10) / 10,
      benchmark: Math.round((benchmarkTrough + (100 - benchmarkTrough) * recoveryProgress * 0.85) * 10) / 10,
    });
  }

  return points;
}

export default function StressTestPanel({ demoMode }: { demoMode?: boolean }) {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const currency = activePortfolioCurrency || "EUR";

  const [selectedCrisis, setSelectedCrisis] = useState<string>("gfc-2008");

  const crisis: CrisisScenario | undefined = CRISIS_SCENARIOS.find(
    (c) => c.id === selectedCrisis
  );

  const holdingInputs = useMemo(() => {
    if (!holdings) return [];
    return holdings.map((h) => {
      const q = quotes[h.ticker];
      const price = q?.regularMarketPrice ?? h.purchasePrice;
      const valLocal = h.shares * price;
      const valEUR = convertToEUR(valLocal, h.displayCurrency, exchangeRates);
      return {
        ticker: h.ticker,
        name: h.name || q?.shortName || h.ticker,
        sector: h.sector || "Diversified",
        currentValue: valEUR,
      };
    });
  }, [holdings, quotes, exchangeRates]);

  const stressResult: StressTestResult | null = useMemo(() => {
    if (!crisis || holdingInputs.length === 0) return null;
    return computeStressTest(
      holdingInputs,
      crisis.sectorDrawdowns,
      crisis.defaultDrawdown,
      crisis.estimatedRecoveryYears
    );
  }, [crisis, holdingInputs]);

  const chartData = useMemo(() => {
    if (!crisis || !stressResult) return [];
    return buildCrisisChart(
      stressResult.portfolioDrawdownPct / 100,
      crisis.benchmarkDrawdown,
      crisis.durationMonths,
      crisis.estimatedRecoveryYears
    );
  }, [crisis, stressResult]);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";

  return (
    <div className="space-y-5">
      {/* Crisis selector */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {t("simulatorStressTestTitle")}
          </h2>
          <span className="text-xs text-gray-500 dark:text-slate-400">{t("simulatorStressTestDesc")}</span>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {t("simulatorStressTestInstructions")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CRISIS_SCENARIOS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCrisis(c.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedCrisis === c.id
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="font-semibold text-sm mb-0.5">{t(c.nameKey) || c.name}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">{c.dateRange}</div>
              <div className="flex gap-4">
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{c.benchmarkIndex}</div>
                  <div className="text-sm font-bold font-mono text-red-500">-{(c.benchmarkDrawdown * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{t("simulatorRecovery")}</div>
                  <div className="text-sm font-bold font-mono">~{c.estimatedRecoveryYears < 1 ? `${Math.round(c.estimatedRecoveryYears * 12)} mo` : `${c.estimatedRecoveryYears} yr`}</div>
                </div>
              </div>
              <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.benchmarkDrawdown > 0.4 ? "bg-red-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(c.benchmarkDrawdown * 100, 100)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Impact chart */}
      {stressResult && crisis && chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">
            {t("simulatorImpactAnalysis")} — {t(crisis.nameKey) || crisis.name}
          </h2>

          <div style={{ aspectRatio: "2.8/1", maxHeight: "min(280px, 40vh)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="st-portfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={{ stroke: isDark ? "#334155" : "#e5e7eb" }}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis
                  domain={[0, 110]}
                  tickFormatter={(v: number) => `${v}`}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#fff",
                    border: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number | string | undefined, name?: string) => [
                    `${(typeof value === "number" ? value : Number(value || 0)).toFixed(1)}`,
                    name === "portfolio" ? t("simulatorYourPortfolio") : crisis!.benchmarkIndex,
                  ]}
                />
                <ReferenceLine y={100} stroke={isDark ? "rgba(148,163,184,0.2)" : "rgba(156,163,175,0.3)"} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="benchmark" stroke="#3b82f6" strokeWidth={1.5} fill="none" dot={false} />
                <Area type="monotone" dataKey="portfolio" stroke="#10b981" strokeWidth={2} fill="url(#st-portfolio)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {t("simulatorYourPortfolio")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              {crisis.benchmarkIndex}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-40" />
              {t("simulatorPreCrisisLevel")}
            </div>
          </div>
        </div>
      )}

      {/* Holding-by-holding impact */}
      {stressResult && stressResult.holdingImpacts.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">{t("simulatorHoldingImpact")}</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{t("simulatorSectorDrawdowns")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorHolding")}</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden sm:table-cell">{t("simulatorSector")}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorCurrentValue")}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorSimulatedLoss")}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden sm:table-cell">{t("simulatorCrisisValue")}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden md:table-cell">{t("simulatorDrawdown")}</th>
                </tr>
              </thead>
              <tbody>
                {stressResult.holdingImpacts
                  .sort((a, b) => b.drawdownPct - a.drawdownPct)
                  .map((impact) => (
                  <tr key={impact.ticker} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{impact.ticker}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[140px]">{impact.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500 dark:text-slate-400 hidden sm:table-cell">{impact.sector}</td>
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums">{formatCurrency(impact.currentValue, currency)}</td>
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums text-red-500">-{formatCurrency(impact.simulatedLoss, currency)}</td>
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums hidden sm:table-cell">{formatCurrency(impact.crisisValue, currency)}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-xs font-mono ${impact.drawdownPct > 50 ? "text-red-500" : "text-amber-500"}`}>
                          -{impact.drawdownPct.toFixed(0)}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${impact.drawdownPct > 50 ? "bg-red-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(impact.drawdownPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stress test summary stats */}
      {stressResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorPortfolioDrawdown")}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-500">-{stressResult.portfolioDrawdownPct.toFixed(1)}%</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorDollarLoss")}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-500">-{formatCurrency(stressResult.dollarLoss, currency)}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorWorstSector")}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-500">{stressResult.worstSector || "—"}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorMostResilient")}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-500">{stressResult.bestSector || "—"}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorRecoveryTime")}</div>
            <div className="text-lg font-bold font-mono tabular-nums">~{stressResult.estimatedRecoveryYears < 1 ? `${Math.round(stressResult.estimatedRecoveryYears * 12)} mo` : `${stressResult.estimatedRecoveryYears} yr`}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorResilienceScore")}</div>
            <div className={`text-lg font-bold font-mono tabular-nums ${stressResult.resilienceScore >= 7 ? "text-emerald-500" : stressResult.resilienceScore >= 4 ? "text-amber-500" : "text-red-500"}`}>
              {stressResult.resilienceScore} / 10
            </div>
          </div>
        </div>
      )}

      <SimulatorDisclaimer />
    </div>
  );
}
