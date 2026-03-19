"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import TierFeatureBadge from "./TierFeatureBadge";

type EvolutionRange = "1w" | "1m" | "3m" | "6m" | "ytd" | "1y";

const RANGE_KEYS: EvolutionRange[] = ["1w", "1m", "3m", "6m", "ytd", "1y"];
const RANGE_LABELS: Record<EvolutionRange, string> = {
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  ytd: "YTD",
  "1y": "1Y",
};
const FREE_RANGES = new Set<EvolutionRange>(["1w", "1m"]);

interface SnapshotPoint {
  date: string;
  value: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SnapshotPoint }>;
  baseCurrency: string;
  stealthMode: boolean;
}

function ChartTooltip({ active, payload, baseCurrency, stealthMode }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(point.date)}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {stealthMode ? "•••••" : formatCurrency(point.value, baseCurrency)}
      </p>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const DEMO_POINTS: SnapshotPoint[] = (() => {
  const pts: SnapshotPoint[] = [];
  let val = 38500;
  for (let i = 90; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    val += (Math.random() - 0.42) * val * 0.006 + val * 0.0003;
    pts.push({ date: d.toISOString().slice(0, 10), value: Math.round(val * 100) / 100 });
  }
  return pts;
})();

export default function PortfolioEvolutionChart() {
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency, activePortfolioId, demoMode } =
    usePortfolio();
  const { user } = useAuth();
  const { layoutTheme, isDark } = useTheme();
  const { stealthMode } = useStealthMode();
  const track = useTrack();

  const baseCurrency = activePortfolioCurrency;
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  const [range, setRange] = useState<EvolutionRange>("1m");
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const backfillingRef = useRef(false);
  const prevHoldingsCount = useRef(holdings.length);

  // Upsert today's snapshot
  useEffect(() => {
    if (demoMode) return;
    const allHaveValue = holdings.every(
      (h) => (quotes[h.ticker]?.regularMarketPrice ?? 0) > 0 || h.valueInEUR > 0,
    );
    if (!allHaveValue || holdings.length === 0) return;

    const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
    if (totals.totalCurrentEUR <= 0) return;
    fetch("/api/portfolio/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalValueEUR: totals.totalCurrentEUR, portfolioId: activePortfolioId || "" }),
    }).catch(() => {});
  // activePortfolioId intentionally excluded — the effect must only fire when
  // holdings/quotes change (after the context fetches data for the new portfolio).
  // Including it causes a race: portfolioId updates before holdings, writing
  // stale totals under the new portfolio's ID.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, cashEntries, quotes, exchangeRates, baseCurrency, demoMode]);

  const triggerBackfill = useCallback(() => {
    if (backfillingRef.current || demoMode) return;
    backfillingRef.current = true;
    setBackfilling(true);
    fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
      .then(() => {
        backfillingRef.current = false;
        setBackfilling(false);
        fetchHistory(range);
      })
      .catch(() => {
        backfillingRef.current = false;
        setBackfilling(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, range]);

  const fetchHistory = useCallback(
    (r: EvolutionRange) => {
      if (demoMode) {
        setPoints(DEMO_POINTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      const pid = activePortfolioId || "";
      fetch(`/api/portfolio/history?range=${r}&portfolioId=${encodeURIComponent(pid)}`)
        .then((res) => (res.ok ? res.json() : { points: [] }))
        .then((data) => {
          const pts: SnapshotPoint[] = Array.isArray(data.points) ? data.points : [];
          setPoints(pts);
          setLoading(false);
          // Auto-backfill when insufficient history for this portfolio
          if (pts.length < 2 && !backfillingRef.current) {
            triggerBackfill();
          }
        })
        .catch(() => setLoading(false));
    },
    [demoMode, activePortfolioId, triggerBackfill],
  );

  // Lazy backfill check on first mount
  useEffect(() => {
    if (demoMode) return;
    fetch("/api/portfolio/backfill-snapshots?check=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.needsBackfill) triggerBackfill();
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  useEffect(() => {
    if (!isPaid && !FREE_RANGES.has(range)) {
      setRange("1m");
      return;
    }
    fetchHistory(range);
  }, [range, isPaid, fetchHistory, activePortfolioId]);

  // Re-backfill when holdings count changes (stock added/removed from dashboard)
  useEffect(() => {
    if (demoMode) return;
    const prev = prevHoldingsCount.current;
    prevHoldingsCount.current = holdings.length;
    if (prev !== 0 && holdings.length !== prev) {
      triggerBackfill();
    }
  }, [holdings.length, demoMode, triggerBackfill]);

  function handleRangeChange(r: EvolutionRange) {
    if (!isPaid && !FREE_RANGES.has(r)) return;
    setRange(r);
    track("evolution_range_changed", { range: r });
  }

  const firstValue = points[0]?.value ?? 0;
  const lastValue = points[points.length - 1]?.value ?? 0;
  const periodReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : null;
  const isPositive = (periodReturn ?? 0) >= 0;

  const accentColor = isPositive ? "#10b981" : "#ef4444";
  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const gridStroke = isDark ? "#334155" : "#e5e7eb";

  const rangePills = (
    <div className="flex gap-1" role="group" aria-label="Time range">
      {RANGE_KEYS.map((r) => {
        const isLocked = !FREE_RANGES.has(r) && !isPaid;
        const isActive = range === r;

        let pillClass: string;
        if (layoutTheme === "terminal") {
          pillClass = `px-2 py-0.5 text-xs font-mono transition-colors ${
            isActive
              ? "text-green-400 border-b border-green-500"
              : isLocked
                ? "text-zinc-700 cursor-default"
                : "text-zinc-500 hover:text-zinc-300 cursor-pointer"
          }`;
        } else if (layoutTheme === "canvas") {
          pillClass = `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isActive
              ? "bg-slate-900 text-white"
              : isLocked
                ? "bg-slate-100 text-slate-300 cursor-default"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          }`;
        } else if (layoutTheme === "studio") {
          pillClass = `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isActive
              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
              : isLocked
                ? "text-white/20 cursor-default"
                : "text-white/50 hover:text-white/80 cursor-pointer"
          }`;
        } else {
          pillClass = `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isActive
              ? "bg-emerald-500 text-white shadow-sm"
              : isLocked
                ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-default"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer"
          }`;
        }

        return (
          <button
            key={r}
            onClick={() => handleRangeChange(r)}
            className={pillClass}
            aria-pressed={isActive}
            disabled={isLocked}
          >
            {RANGE_LABELS[r]}
            {isLocked && (
              <svg
                className="inline ml-0.5 w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );

  const periodReturnEl =
    points.length >= 2 && periodReturn !== null ? (
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            isPositive
              ? layoutTheme === "terminal"
                ? "text-green-400"
                : "text-emerald-600 dark:text-emerald-400"
              : layoutTheme === "terminal"
                ? "text-red-400"
                : "text-red-500 dark:text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {formatPercent(periodReturn)}
        </span>
        <span
          className={`text-xs tabular-nums ${
            layoutTheme === "terminal"
              ? "text-zinc-600"
              : layoutTheme === "canvas"
                ? "text-slate-400"
                : layoutTheme === "studio"
                  ? "text-white/40"
                  : "text-gray-400 dark:text-slate-500"
          }`}
        >
          {stealthMode
            ? "••••• → •••••"
            : `${formatCurrency(firstValue, baseCurrency)} → ${formatCurrency(lastValue, baseCurrency)}`}
        </span>
      </div>
    ) : null;

  const chartContent = loading || backfilling ? (
    <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400 dark:text-slate-500">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
      <span>{backfilling ? t("calculatingHistory") : t("loading")}</span>
    </div>
  ) : points.length < 2 ? (
    <div className="py-12 text-center">
      <p
        className={`text-sm ${
          layoutTheme === "terminal"
            ? "text-zinc-600"
            : layoutTheme === "canvas"
              ? "text-slate-400"
              : layoutTheme === "studio"
                ? "text-white/40"
                : "text-gray-400 dark:text-slate-500"
        }`}
      >
        {t("evolutionEmpty")}
      </p>
    </div>
  ) : (
    <div className="h-48" role="img" aria-label="Portfolio value evolution chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="evolutionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={layoutTheme === "terminal" ? "#27272a" : gridStroke}
            strokeOpacity={layoutTheme === "studio" ? 0.15 : 0.4}
          />
          <XAxis
            dataKey="date"
            tick={{
              fontSize: layoutTheme === "terminal" ? 10 : 11,
              fill: layoutTheme === "terminal" ? "#52525b" : layoutTheme === "canvas" ? "#94a3b8" : layoutTheme === "studio" ? "rgba(255,255,255,0.3)" : tickFill,
              ...(layoutTheme === "terminal" ? { fontFamily: "monospace" } : {}),
            }}
            tickFormatter={(d: string) => formatDateLabel(d)}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{
              fontSize: layoutTheme === "terminal" ? 10 : 11,
              fill: layoutTheme === "terminal" ? "#52525b" : layoutTheme === "canvas" ? "#94a3b8" : layoutTheme === "studio" ? "rgba(255,255,255,0.3)" : tickFill,
              ...(layoutTheme === "terminal" ? { fontFamily: "monospace" } : {}),
            }}
            tickFormatter={(v: number) =>
              stealthMode ? "•••" : formatCurrency(v, baseCurrency)
            }
            width={70}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip baseCurrency={baseCurrency} stealthMode={stealthMode} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={accentColor}
            strokeWidth={2}
            fill="url(#evolutionGrad)"
            dot={false}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  /* ── TERMINAL ── */
  if (layoutTheme === "terminal") {
    return (
      <div className="border-b border-zinc-800 py-3 space-y-2" data-testid="evolution-chart-terminal">
        <div className="flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">
              {t("performance")}
            </span>
            <p className="text-[9px] text-zinc-700 mt-0.5">{t("performanceSubtitle")}</p>
          </div>
          {rangePills}
        </div>
        {periodReturnEl}
        {chartContent}
      </div>
    );
  }

  /* ── CANVAS ── */
  if (layoutTheme === "canvas") {
    return (
      <div
        className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm space-y-3"
        data-testid="evolution-chart-canvas"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {t("performance")}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t("performanceSubtitle")}</p>
          </div>
          {rangePills}
        </div>
        {periodReturnEl}
        {chartContent}
      </div>
    );
  }

  /* ── STUDIO ── */
  if (layoutTheme === "studio") {
    return (
      <div
        className="relative bg-slate-900 border border-white/[0.06] rounded-2xl p-5 space-y-3 overflow-hidden"
        data-testid="evolution-chart-studio"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              {t("performance")}
            </h3>
            <p className="text-[9px] text-white/30 mt-0.5">{t("performanceSubtitle")}</p>
          </div>
          {rangePills}
        </div>
        {periodReturnEl}
        {chartContent}
      </div>
    );
  }

  /* ── DEFAULT ── */
  return (
    <div className="card px-5 py-4 space-y-3" data-testid="evolution-chart">
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"
            style={{ fontSize: "var(--text-body)" }}
          >
            {t("performance")}
            <TierFeatureBadge requiredPlan="starter" size="sm" />
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{t("performanceSubtitle")}</p>
        </div>
        {rangePills}
      </div>
      {periodReturnEl}
      {chartContent}
    </div>
  );
}
