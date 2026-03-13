"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, formatCurrency, formatCompactNumber } from "@/lib/utils";
import SimulatorDisclaimer from "./SimulatorDisclaimer";

interface ScenarioRow {
  id: string;
  ticker: string;
  name: string;
  currentShares: number;
  scenarioShares: number;
  pricePerShare: number;
  displayCurrency: string;
  dividendYield: number;
  sector: string;
  isNew: boolean;
}

interface ProjectionPoint {
  year: number;
  current: number;
  scenario: number;
}

const HORIZONS = [1, 3, 5, 10] as const;
const GROWTH_RATE = 0.07;

export default function WhatIfPanel({ demoMode }: { demoMode?: boolean }) {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const currency = activePortfolioCurrency || "EUR";

  const [horizon, setHorizon] = useState<number>(5);
  const [hasRun, setHasRun] = useState(false);

  const initialRows: ScenarioRow[] = useMemo(() => {
    if (!holdings) return [];
    return holdings.map((h) => {
      const q = quotes[h.ticker];
      const price = q?.regularMarketPrice ?? h.purchasePrice;
      const divYield = q?.trailingAnnualDividendYield ?? 0;
      return {
        id: h.id,
        ticker: h.ticker,
        name: h.name || q?.shortName || h.ticker,
        currentShares: h.shares,
        scenarioShares: h.shares,
        pricePerShare: price,
        displayCurrency: h.displayCurrency,
        dividendYield: divYield,
        sector: h.sector || "Diversified",
        isNew: false,
      };
    });
  }, [holdings, quotes]);

  const [rows, setRows] = useState<ScenarioRow[]>(initialRows);

  const updateRow = useCallback((id: string, shares: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, scenarioShares: shares } : r))
    );
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    const id = `new-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id,
        ticker: "",
        name: "",
        currentShares: 0,
        scenarioShares: 0,
        pricePerShare: 0,
        displayCurrency: currency,
        dividendYield: 0,
        sector: "Diversified",
        isNew: true,
      },
    ]);
  }, [currency]);

  const resetToPortfolio = useCallback(() => {
    setRows(initialRows);
    setHasRun(false);
  }, [initialRows]);

  const currentTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const val = r.currentShares * r.pricePerShare;
      return sum + convertToEUR(val, r.displayCurrency, exchangeRates);
    }, 0);
  }, [rows, exchangeRates]);

  const scenarioTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const val = r.scenarioShares * r.pricePerShare;
      return sum + convertToEUR(val, r.displayCurrency, exchangeRates);
    }, 0);
  }, [rows, exchangeRates]);

  const projectionData: ProjectionPoint[] = useMemo(() => {
    const points: ProjectionPoint[] = [];
    for (let y = 0; y <= horizon; y++) {
      points.push({
        year: y,
        current: Math.round(currentTotal * Math.pow(1 + GROWTH_RATE, y)),
        scenario: Math.round(scenarioTotal * Math.pow(1 + GROWTH_RATE, y)),
      });
    }
    return points;
  }, [currentTotal, scenarioTotal, horizon]);

  const currentDivYield = useMemo(() => {
    let weightedYield = 0;
    let totalVal = 0;
    for (const r of rows) {
      const val = r.currentShares * r.pricePerShare;
      const valEUR = convertToEUR(val, r.displayCurrency, exchangeRates);
      weightedYield += valEUR * r.dividendYield;
      totalVal += valEUR;
    }
    return totalVal > 0 ? (weightedYield / totalVal) * 100 : 0;
  }, [rows, exchangeRates]);

  const scenarioDivYield = useMemo(() => {
    let weightedYield = 0;
    let totalVal = 0;
    for (const r of rows) {
      const val = r.scenarioShares * r.pricePerShare;
      const valEUR = convertToEUR(val, r.displayCurrency, exchangeRates);
      weightedYield += valEUR * r.dividendYield;
      totalVal += valEUR;
    }
    return totalVal > 0 ? (weightedYield / totalVal) * 100 : 0;
  }, [rows, exchangeRates]);

  const sectorConcentration = useMemo(() => {
    const sectors = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      const val = convertToEUR(r.scenarioShares * r.pricePerShare, r.displayCurrency, exchangeRates);
      sectors.set(r.sector, (sectors.get(r.sector) || 0) + val);
      total += val;
    }
    let maxPct = 0;
    for (const [, val] of sectors) {
      const pct = total > 0 ? (val / total) * 100 : 0;
      if (pct > maxPct) maxPct = pct;
    }
    return maxPct;
  }, [rows, exchangeRates]);

  const currentSectorConcentration = useMemo(() => {
    const sectors = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      const val = convertToEUR(r.currentShares * r.pricePerShare, r.displayCurrency, exchangeRates);
      sectors.set(r.sector, (sectors.get(r.sector) || 0) + val);
      total += val;
    }
    let maxPct = 0;
    for (const [, val] of sectors) {
      const pct = total > 0 ? (val / total) * 100 : 0;
      if (pct > maxPct) maxPct = pct;
    }
    return maxPct;
  }, [rows, exchangeRates]);

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";

  const getChangeBadge = (r: ScenarioRow) => {
    if (r.isNew && r.scenarioShares > 0) return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">+New</span>;
    if (r.currentShares === r.scenarioShares) return <span className="text-gray-400 dark:text-slate-500">—</span>;
    if (r.scenarioShares === 0) return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">{t("simulatorSellAll")}</span>;
    const diff = r.scenarioShares - r.currentShares;
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${diff > 0 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
        {diff > 0 ? "+" : ""}{diff} {t("shares")}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Compare header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            {t("simulatorCurrentPortfolio")}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(currentTotal, currency)}</div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{rows.filter((r) => r.currentShares > 0).length} {t("holdings")}</div>
        </div>
        <div className="card p-4 text-center border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
            {t("simulatorScenarioPortfolio")}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(scenarioTotal, currency)}</div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("simulatorModifyBelow")}</div>
        </div>
      </div>

      {/* Scenario builder */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            {t("simulatorScenarioBuilder")}
          </h2>
          <div className="flex gap-2">
            <button onClick={resetToPortfolio} className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
              {t("simulatorResetToCurrent")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorHolding")}</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorCurrentShares")}</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2">{t("simulatorScenarioShares")}</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden sm:table-cell">{t("simulatorCurrentValue")}</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden sm:table-cell">{t("simulatorScenarioValue")}</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide py-2 px-2 hidden md:table-cell">{t("change")}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const currentVal = convertToEUR(r.currentShares * r.pricePerShare, r.displayCurrency, exchangeRates);
                const scenarioVal = convertToEUR(r.scenarioShares * r.pricePerShare, r.displayCurrency, exchangeRates);
                const isChanged = r.currentShares !== r.scenarioShares;
                return (
                  <tr key={r.id} className={`border-b border-gray-100 dark:border-slate-700/50 ${r.isNew ? "bg-emerald-500/5" : ""}`}>
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{r.ticker || "—"}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px]">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums">
                      {r.isNew ? <span className="text-gray-400">—</span> : r.currentShares}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={r.scenarioShares}
                        onChange={(e) => updateRow(r.id, Math.max(0, Number(e.target.value)))}
                        className={`w-20 bg-white dark:bg-slate-900 border rounded-md px-2 py-1 text-right text-sm font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${
                          isChanged ? "border-amber-400 dark:border-amber-500/50" : "border-gray-200 dark:border-slate-600"
                        }`}
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums hidden sm:table-cell">
                      {r.isNew ? <span className="text-gray-400">—</span> : formatCurrency(currentVal, currency)}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono text-sm tabular-nums hidden sm:table-cell ${isChanged ? (scenarioVal > currentVal ? "text-emerald-500" : "text-red-500") : ""}`}>
                      {formatCurrency(scenarioVal, currency)}
                    </td>
                    <td className="py-3 px-2 text-right hidden md:table-cell">{getChangeBadge(r)}</td>
                    <td className="py-3 px-2">
                      <button onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={addRow}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("simulatorAddHolding")}
        </button>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setHasRun(true)}
            disabled={demoMode}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {t("simulatorRunProjection")}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t("simulatorHorizon")}</span>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 appearance-none cursor-pointer"
            >
              {HORIZONS.map((h) => (
                <option key={h} value={h}>{h} {h === 1 ? t("simulatorYear") : t("simulatorYears")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projection chart */}
      {hasRun && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">
            {t("simulatorProjectedGrowth")} — {horizon}Y
          </h2>
          <div style={{ aspectRatio: "2.8/1", maxHeight: "min(280px, 40vh)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="wi-current" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="wi-scenario" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tickFormatter={(y: number) => `${y}Y`}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={{ stroke: isDark ? "#334155" : "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCompactNumber(v)}
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
                    formatCurrency(typeof value === "number" ? value : Number(value || 0), currency),
                    name === "current" ? t("simulatorCurrentPortfolio") : t("simulatorScenarioPortfolio"),
                  ]}
                  labelFormatter={(label) => `${t("simulatorYear")} ${label}`}
                />
                <Area type="monotone" dataKey="current" stroke="#64748b" strokeWidth={1.5} fill="url(#wi-current)" dot={false} />
                <Area type="monotone" dataKey="scenario" stroke="#10b981" strokeWidth={2} fill="url(#wi-scenario)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              {t("simulatorCurrentPortfolio")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {t("simulatorScenarioPortfolio")}
            </div>
          </div>
        </div>
      )}

      {/* Delta stats */}
      {hasRun && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorCurrentProjected")}</div>
            <div className="text-lg font-bold font-mono tabular-nums">{formatCurrency(projectionData[projectionData.length - 1]?.current ?? 0, currency)}</div>
            <div className="text-[11px] text-gray-400 dark:text-slate-500">{t("simulatorBasedOnGrowth")}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorScenarioProjected")}</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-500">{formatCurrency(projectionData[projectionData.length - 1]?.scenario ?? 0, currency)}</div>
            <div className="text-[11px] text-emerald-500">
              {(() => {
                const diff = (projectionData[projectionData.length - 1]?.scenario ?? 0) - (projectionData[projectionData.length - 1]?.current ?? 0);
                return `${diff >= 0 ? "+" : ""}${formatCurrency(diff, currency)} vs ${t("simulatorCurrentLabel")}`;
              })()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorDivYieldChange")}</div>
            <div className="text-lg font-bold font-mono tabular-nums">
              <span className="text-red-500">{currentDivYield.toFixed(1)}%</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="text-emerald-500">{scenarioDivYield.toFixed(1)}%</span>
            </div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t("simulatorSectorConcentration")}</div>
            <div className="text-lg font-bold font-mono tabular-nums">
              <span className="text-red-500">{currentSectorConcentration.toFixed(0)}%</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="text-emerald-500">{sectorConcentration.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      <SimulatorDisclaimer />
    </div>
  );
}
