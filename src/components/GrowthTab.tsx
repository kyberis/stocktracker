"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });

type Range = "1m" | "3m" | "6m" | "1y" | "all";
const FREE_RANGE: Range = "1m";
const STARTER_MAX_RANGE: Range = "1y";

interface SnapshotPoint {
  date: string;
  value: number;
}

export default function GrowthTab() {
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates } = usePortfolio();
  const { user } = useAuth();
  const track = useTrack();
  const [range, setRange] = useState<Range>("1m");
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = user?.plan === "pro";
  const isStarter = user?.plan === "starter";

  const STARTER_RANGES = new Set<Range>(["1m", "3m", "6m", "1y"]);

  // Upsert today's snapshot when portfolio loads
  useEffect(() => {
    const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates);
    if (totals.totalCurrentEUR <= 0) return;
    fetch("/api/portfolio/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalValueEUR: totals.totalCurrentEUR }),
    }).catch(() => {});
  }, [holdings, cashEntries, quotes, exchangeRates]);

  useEffect(() => {
    const isFreeRange = range === FREE_RANGE;
    const isStarterRange = STARTER_RANGES.has(range);
    const blocked = (!isFreeRange && !isStarter && !isPro) || (!isStarterRange && isStarter && !isPro);
    if (blocked) {
      setShowPaywall(true);
      return;
    }
    setShowPaywall(false);
    setLoading(true);
    fetch(`/api/portfolio/history?range=${range}`)
      .then((r) => r.ok ? r.json() : { points: [] })
      .then((data) => {
        setPoints(Array.isArray(data.points) ? data.points : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, isPro, isStarter]);

  function handleRangeChange(r: Range) {
    setRange(r);
    track("growth_range_changed", { range: r });
  }

  const ranges: Range[] = ["1m", "3m", "6m", "1y", "all"];

  const firstValue = points[0]?.value ?? 0;
  const lastValue = points[points.length - 1]?.value ?? 0;
  const periodReturn = firstValue > 0
    ? ((lastValue - firstValue) / firstValue) * 100
    : null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("growthTab")}</h3>
        <div className="flex gap-1" role="group" aria-label="Time range">
          {ranges.map((r) => {
            const isLocked = r !== FREE_RANGE && !isPro;
            return (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  range === r
                    ? "bg-emerald-500 text-white"
                    : isLocked
                    ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
                aria-pressed={range === r}
              >
                {r.toUpperCase()}
                {isLocked && (
                  <svg className="inline ml-1 w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showPaywall ? (
        <ProCompareCard surface="portfolio_history_locked" reason="upgrade_required" compact />
      ) : loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
          <span>{t("loading")}</span>
        </div>
      ) : points.length < 2 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-slate-500">{t("growthTabEmpty")}</p>
        </div>
      ) : (
        <>
          {periodReturn !== null && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${periodReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {formatPercent(periodReturn)}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {formatCurrency(firstValue, "EUR")} → {formatCurrency(lastValue, "EUR")}
              </span>
            </div>
          )}
          <div
            className="h-48"
            role="img"
            aria-label={`${t("growthTab")}: portfolio value over time`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v: number) => formatCurrency(v, "EUR")}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v, "EUR"), t("growthTab")]}
                  labelFormatter={(l: string) => l}
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#growthGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="text-[10px] text-gray-400 dark:text-slate-500">{t("financialDataDisclaimer")}</p>
    </div>
  );
}
