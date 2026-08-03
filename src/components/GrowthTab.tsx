"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import EmptyState from "./EmptyState";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const BlurredProSection = dynamic(() => import("./BlurredProSection"), { ssr: false });
import TierFeatureBadge from "./TierFeatureBadge";

type Range = "1m" | "3m" | "6m" | "1y" | "all";
type ChartMode = "value" | "performance";
const FREE_RANGE: Range = "1m";

const GROWTH_RANGE_LABELS: Record<Range, string> = {
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  all: "MAX",
};

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
}

interface PerfPoint {
  date: string;
  pct: number;
}

export default function GrowthTab() {
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency, activePortfolioId } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const { user } = useAuth();
  const track = useTrack();
  const [range, setRange] = useState<Range>("1m");
  const [chartMode, setChartMode] = useState<ChartMode>("value");
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const isPaid = user?.plan === "pro";

  useEffect(() => {
    const isFreeRange = range === FREE_RANGE;
    if (!isFreeRange && !isPaid) {
      setShowPaywall(true);
      return;
    }
    setShowPaywall(false);
    setLoading(true);
    const pid = activePortfolioId || "";
    fetch(`/api/portfolio/history?range=${range}&portfolioId=${encodeURIComponent(pid)}`)
      .then((r) => r.ok ? r.json() : { points: [] })
      .then((data) => {
        const raw = Array.isArray(data.points) ? data.points : [];
        setPoints(raw.map((p: { date: string; value: number; invested?: number }) => ({
          date: p.date,
          value: p.value,
          invested: p.invested || 0,
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
   
  }, [range, isPaid, activePortfolioId]);

  function handleRangeChange(r: Range) {
    setRange(r);
    track("growth_range_changed", { range: r });
  }

  const ranges: Range[] = ["1m", "3m", "6m", "1y", "all"];

  const hasInvestedData = points.some((p) => p.invested > 0);
  const isPerf = chartMode === "performance" && hasInvestedData;

  const rawPerfPoints: PerfPoint[] = points.map((p) => ({
    date: p.date,
    pct: p.invested > 0 ? ((p.value - p.invested) / p.invested) * 100 : 0,
  }));
  const basePct = rawPerfPoints[0]?.pct ?? 0;
  const perfPoints: PerfPoint[] = rawPerfPoints.map((p) => ({
    date: p.date,
    pct: p.pct - basePct,
  }));

  const firstValue = points[0]?.value ?? 0;
  const lastValue = points[points.length - 1]?.value ?? 0;

  let periodReturn: number | null;
  if (isPerf) {
    const firstPct = perfPoints[0]?.pct ?? 0;
    const lastPct = perfPoints[perfPoints.length - 1]?.pct ?? 0;
    periodReturn = lastPct - firstPct;
  } else {
    periodReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : null;
  }

  const accentColor = (periodReturn ?? 0) >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            {t("growthTab")}
            <TierFeatureBadge requiredPlan="pro" size="sm" />
          </h3>
          <button
            onClick={() => setShowExplainer((v) => !v)}
            className="p-1 rounded-full text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
            aria-label="Chart info"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasInvestedData && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700" role="group" aria-label="Chart mode">
              {(["value", "performance"] as ChartMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setChartMode(m); track("growth_mode_changed", { mode: m }); }}
                  className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    chartMode === m
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                  aria-pressed={chartMode === m}
                >
                  {t(m === "value" ? "chartModeValue" : "chartModePerformance")}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1" role="group" aria-label="Time range">
            {ranges.map((r) => {
              const isLocked = r !== FREE_RANGE && !isPaid;
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
                  {GROWTH_RANGE_LABELS[r]}
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
      </div>

      <p className="text-[10px] text-gray-400 dark:text-slate-500">
        {isPerf ? t("chartPerformanceSubtitle") : t("chartValueSubtitle")}
      </p>

      {showExplainer && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-3 space-y-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{t("chartModeValue")}</p>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px]">{t("chartValueExplainer")}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{t("chartModePerformance")}</p>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px]">{t("chartPerformanceExplainer")}</p>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
          iconClassName="from-violet-400 to-violet-600 shadow-violet-500/20"
          title={t("growthTabEmptyTitle")}
          subtitle={t("growthTabEmpty")}
        />
      ) : showPaywall ? (
        <BlurredProSection blurb="Upgrade to Trefolio for full portfolio history with 3M, 6M, 1Y, and All-time views." ctaLabel="Upgrade to Trefolio">
          <div className="h-64 rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent" />
        </BlurredProSection>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
          <span>{t("loading")}</span>
        </div>
      ) : points.length < 2 ? (
        <EmptyState
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
          iconClassName="from-violet-400 to-violet-600 shadow-violet-500/20"
          title={t("growthTabEmptyTitle")}
          subtitle={t("growthTabEmpty")}
        />
      ) : (
        <>
          {periodReturn !== null && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${periodReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {formatPercent(periodReturn)}
              </span>
              {!isPerf && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {formatCurrency(firstValue, baseCurrency)} → {formatCurrency(lastValue, baseCurrency)}
                </span>
              )}
            </div>
          )}
          <div
            className="h-48"
            role="img"
            aria-label={isPerf ? "Portfolio performance over time" : `${t("growthTab")}: portfolio value over time`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isPerf ? perfPoints : points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="investedGradGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(d: string) => {
                    const hasTime = d.includes(" ") || d.includes("T");
                    if (hasTime) {
                      const dt = new Date(d.replace(" ", "T"));
                      return dt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
                    }
                    return d.slice(5);
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v: number) =>
                    isPerf
                      ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
                      : formatCurrency(v, baseCurrency)
                  }
                  width={70}
                />
                {isPerf && (
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                )}
                <Tooltip
                  formatter={(v, name) => {
                    if (isPerf) return [`${formatPercent(Number(v ?? 0))}`, t("chartModePerformance")];
                    const label = name === "invested" ? t("investedCapital") : t("portfolioValueLabel");
                    return [formatCurrency(Number(v ?? 0), baseCurrency), label];
                  }}
                  labelFormatter={(l) => String(l)}
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                />
                {!isPerf && hasInvestedData && (
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#investedGradGrowth)"
                    dot={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey={isPerf ? "pct" : "value"}
                  stroke={accentColor}
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
