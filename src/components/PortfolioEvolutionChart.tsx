"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useTrack } from "@/lib/use-track";
import { formatCurrency, formatPercent } from "@/lib/utils";
import TierFeatureBadge from "./TierFeatureBadge";
import ChartAiChatPanel from "./ChartAiChatPanel";

type ChartMode = "value" | "performance";

type EvolutionRange = "1w" | "1m" | "3m" | "6m" | "ytd" | "1y" | "all";

const RANGE_KEYS: EvolutionRange[] = ["1w", "1m", "3m", "6m", "ytd", "1y", "all"];
const RANGE_LABELS: Record<EvolutionRange, string> = {
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  ytd: "YTD",
  "1y": "1Y",
  all: "MAX",
};
const FREE_RANGES = new Set<EvolutionRange>(["1w", "1m"]);

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
}

interface PerfPoint {
  date: string;
  pct: number;
}

interface EventMarker {
  id?: string;
  date: string;
  type: string;
  ticker: string;
  name: string;
  shares: number;
  totalAmount?: number;
  currency?: string;
}

interface BenchmarkTooltipEntry {
  key: string;
  label: string;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: (SnapshotPoint | PerfPoint) & { events?: EventMarker[]; [k: string]: unknown } }>;
  baseCurrency: string;
  stealthMode: boolean;
  mode: ChartMode;
  t: (key: string) => string;
  benchmarkEntries?: BenchmarkTooltipEntry[];
}

function formatEventShares(shares: number): string {
  if (Number.isInteger(shares)) return shares.toLocaleString();
  return shares.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function eventMarkerFill(type: string): string {
  switch (type) {
    case "sell":
      return "#ef4444";
    case "buy":
      return "#10b981";
    case "dividend":
      return "#f59e0b";
    case "fee":
      return "#8b5cf6";
    default:
      return "#64748b";
  }
}

function eventMarkerDotClass(type: string): string {
  switch (type) {
    case "sell":
      return "bg-red-500";
    case "buy":
      return "bg-emerald-500";
    case "dividend":
      return "bg-amber-500";
    case "fee":
      return "bg-violet-500";
    default:
      return "bg-slate-500";
  }
}

function formatEventLine(
  e: EventMarker,
  t: (key: string) => string,
  stealthMode: boolean,
  baseCurrency: string,
): string {
  const label =
    e.type === "sell"
      ? t("eventSold")
      : e.type === "buy"
        ? t("eventBought")
        : e.type === "dividend"
          ? t("txDividend")
          : e.type === "fee"
            ? t("txFee")
            : e.type;
  const qtyPart =
    e.type === "buy" || e.type === "sell"
      ? `${formatEventShares(e.shares)} ${e.ticker}`
      : e.ticker;
  let line = `${label} ${qtyPart}`;
  if (
    !stealthMode &&
    e.totalAmount != null &&
    Number.isFinite(e.totalAmount) &&
    Math.abs(e.totalAmount) > 1e-9
  ) {
    const ccy = e.currency || baseCurrency;
    line += ` · ${formatCurrency(e.totalAmount, ccy)}`;
  }
  return line;
}

function EventsTooltipSection({
  events,
  t,
  stealthMode,
  baseCurrency,
}: {
  events?: EventMarker[];
  t: (key: string) => string;
  stealthMode: boolean;
  baseCurrency: string;
}) {
  if (!events?.length) return null;
  return (
    <div className="border-t border-gray-200 dark:border-slate-600 mt-1.5 pt-1.5 space-y-0.5 max-h-40 overflow-y-auto">
      {events.map((e, i) => (
        <div key={e.id || `${e.type}-${e.date}-${e.ticker}-${i}`} className="flex items-start gap-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${eventMarkerDotClass(e.type)}`} />
          <span className="text-[10px] text-gray-600 dark:text-slate-300 leading-snug">
            {formatEventLine(e, t, stealthMode, baseCurrency)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, baseCurrency, stealthMode, mode, t, benchmarkEntries }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const events = point.events as EventMarker[] | undefined;

  const benchmarkRows = benchmarkEntries?.map((b) => {
    const val = point[`bench_${b.key}`];
    if (val == null || typeof val !== "number") return null;
    const isPos = val >= 0;
    return (
      <div key={b.key} className="flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{b.label}</span>
        <span className={`text-[11px] font-semibold tabular-nums ml-auto ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {isPos ? "+" : ""}{val.toFixed(1)}%
        </span>
      </div>
    );
  }).filter(Boolean);

  if (mode === "performance") {
    const p = point as PerfPoint;
    const isPos = p.pct >= 0;
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
        <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(p.date)}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[10px] text-gray-500 dark:text-slate-400">{t("portfolio")}</span>
          <span className={`text-[11px] font-semibold tabular-nums ml-auto ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {isPos ? "+" : ""}{formatPercent(p.pct)}
          </span>
        </div>
        {benchmarkRows}
        <EventsTooltipSection events={events} t={t} stealthMode={stealthMode} baseCurrency={baseCurrency} />
      </div>
    );
  }
  const sp = point as SnapshotPoint;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDateLabel(sp.date)}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[10px] text-gray-500 dark:text-slate-400">{t("portfolioValueLabel")}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums ml-auto">
          {stealthMode ? "•••••" : formatCurrency(sp.value, baseCurrency)}
        </span>
      </div>
      {sp.invested > 0 && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500 shrink-0" />
          <span className="text-[10px] text-gray-500 dark:text-slate-400">{t("investedCapital")}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums ml-auto">
            {stealthMode ? "•••••" : formatCurrency(sp.invested, baseCurrency)}
          </span>
        </div>
      )}
      {benchmarkRows}
      <EventsTooltipSection events={events} t={t} stealthMode={stealthMode} baseCurrency={baseCurrency} />
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const hasTime = dateStr.includes(" ") || dateStr.includes("T");
  if (hasTime) {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const DEMO_POINTS: SnapshotPoint[] = (() => {
  const pts: SnapshotPoint[] = [];
  let val = 38500;
  let invested = 35000;
  for (let i = 90; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    if (i === 60) invested += 2000;
    if (i === 30) invested += 1500;
    if (i <= 7) {
      for (let h = 9; h <= 17; h += 2) {
        val += (Math.random() - 0.42) * val * 0.001 + val * 0.00005;
        const hd = new Date(d);
        hd.setHours(h, 0, 0, 0);
        const dateStr = hd.toISOString().slice(0, 13).replace("T", " ") + ":00";
        pts.push({ date: dateStr, value: Math.round(val * 100) / 100, invested: Math.round(invested * 100) / 100 });
      }
    } else {
      val += (Math.random() - 0.42) * val * 0.006 + val * 0.0003;
      pts.push({ date: d.toISOString().slice(0, 10), value: Math.round(val * 100) / 100, invested: Math.round(invested * 100) / 100 });
    }
  }
  return pts;
})();

const DEMO_EVENTS: EventMarker[] = (() => {
  const evts: EventMarker[] = [];
  const d60 = new Date(); d60.setDate(d60.getDate() - 60);
  evts.push({
    id: "demo-1",
    date: d60.toISOString().slice(0, 10),
    type: "buy",
    ticker: "AAPL",
    name: "Apple Inc.",
    shares: 10,
    totalAmount: 1850,
    currency: "USD",
  });
  const d45 = new Date(); d45.setDate(d45.getDate() - 45);
  evts.push({
    id: "demo-2",
    date: d45.toISOString().slice(0, 10),
    type: "sell",
    ticker: "TSLA",
    name: "Tesla Inc.",
    shares: 15,
    totalAmount: 3200,
    currency: "USD",
  });
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  evts.push({
    id: "demo-3",
    date: d30.toISOString().slice(0, 10),
    type: "buy",
    ticker: "MSFT",
    name: "Microsoft Corp.",
    shares: 5,
    totalAmount: 2100,
    currency: "USD",
  });
  const d25 = new Date(); d25.setDate(d25.getDate() - 25);
  evts.push({
    id: "demo-4",
    date: d25.toISOString().slice(0, 10),
    type: "dividend",
    ticker: "AAPL",
    name: "Apple Inc.",
    shares: 0,
    totalAmount: 12.5,
    currency: "USD",
  });
  const d20 = new Date(); d20.setDate(d20.getDate() - 20);
  evts.push({
    id: "demo-5",
    date: d20.toISOString().slice(0, 10),
    type: "fee",
    ticker: "BROKER",
    name: "Custody",
    shares: 0,
    totalAmount: -4.99,
    currency: "EUR",
  });
  return evts;
})();

function attachEventsToPoints<T extends { date: string }>(
  pts: T[],
  evts: EventMarker[],
): (T & { events?: EventMarker[] })[] {
  if (!evts.length || !pts.length) return pts;
  const result = pts.map(p => ({ ...p } as T & { events?: EventMarker[] }));

  for (const evt of evts) {
    const evtMs = new Date(evt.date).getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < result.length; i++) {
      const ptMs = new Date(result[i].date.slice(0, 10)).getTime();
      const diff = Math.abs(ptMs - evtMs);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }
    if (bestDiff <= 3 * 86400000) {
      if (!result[bestIdx].events) result[bestIdx].events = [];
      result[bestIdx].events!.push(evt);
    }
  }

  return result;
}

export interface BenchmarkOverlay {
  key: string;
  symbol: string;
  label: string;
  color: string;
}

interface EvolutionChartProps {
  embedded?: boolean;
  benchmarks?: BenchmarkOverlay[];
  onRemoveBenchmark?: (key: string) => void;
}

function normalizeBenchmarkSeries(values: number[]): number[] {
  if (values.length === 0) return [];
  const first = values[0];
  if (!first || first <= 0) return values.map(() => 0);
  return values.map((v) => ((v - first) / first) * 100);
}

export default function PortfolioEvolutionChart({ embedded, benchmarks, onRemoveBenchmark }: EvolutionChartProps = {}) {
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
  const [chartMode, setChartMode] = useState<ChartMode>("value");
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  /** Any POST /backfill-snapshots in flight (manual or silent). */
  const backfillInFlightRef = useRef(false);
  /** Only one automatic sparse-history backfill attempt per portfolio (pts &lt; 2). */
  const sparseBackfillAttemptedRef = useRef(false);
  const prevHoldingsCount = useRef(holdings.length);
  const fetchHistoryRef = useRef<(r: EvolutionRange) => void>(() => {});

  // Benchmark overlay data
  const [benchmarkData, setBenchmarkData] = useState<Record<string, number[]>>({});
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const benchmarkAbortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(
    (r: EvolutionRange) => {
      if (demoMode) {
        setPoints(DEMO_POINTS);
        setEvents(DEMO_EVENTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      const pid = activePortfolioId || "";
      fetch(`/api/portfolio/history?range=${r}&portfolioId=${encodeURIComponent(pid)}`)
        .then((res) => (res.ok ? res.json() : { points: [] }))
        .then((data) => {
          const raw = Array.isArray(data.points) ? data.points : [];
          const pts: SnapshotPoint[] = raw.map((p: { date: string; value: number; invested?: number }) => ({
            date: p.date,
            value: p.value,
            invested: p.invested || 0,
          }));
          setPoints(pts);
          setEvents(Array.isArray(data.events) ? data.events : []);
          setLoading(false);
          // Auto-backfill once when insufficient history — silent (no “Calculating…” overlay).
          if (
            pts.length < 2 &&
            !sparseBackfillAttemptedRef.current &&
            !backfillInFlightRef.current
          ) {
            sparseBackfillAttemptedRef.current = true;
            backfillInFlightRef.current = true;
            fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
              .finally(() => {
                backfillInFlightRef.current = false;
                fetchHistoryRef.current(r);
              });
          }
        })
        .catch(() => setLoading(false));
    },
    [demoMode, activePortfolioId],
  );

  useEffect(() => {
    fetchHistoryRef.current = fetchHistory;
  }, [fetchHistory]);

  /** User-triggered recalculate — shows “Calculating portfolio history…”. */
  const triggerBackfill = useCallback(() => {
    if (backfillInFlightRef.current || demoMode) return;
    backfillInFlightRef.current = true;
    setBackfilling(true);
    fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
      .then(() => {
        backfillInFlightRef.current = false;
        setBackfilling(false);
        fetchHistoryRef.current(range);
      })
      .catch(() => {
        backfillInFlightRef.current = false;
        setBackfilling(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, range]);

  useEffect(() => {
    sparseBackfillAttemptedRef.current = false;
  }, [activePortfolioId]);

  useEffect(() => {
    if (!isPaid && !FREE_RANGES.has(range)) {
      setRange("1m");
      return;
    }
    fetchHistory(range);
  }, [range, isPaid, fetchHistory, activePortfolioId]);

  // Re-backfill when holdings count changes (stock added/removed) — silent refresh, no blocking overlay.
  useEffect(() => {
    if (demoMode) return;
    const prev = prevHoldingsCount.current;
    prevHoldingsCount.current = holdings.length;
    if (prev !== 0 && holdings.length !== prev && !backfillInFlightRef.current) {
      backfillInFlightRef.current = true;
      fetch("/api/portfolio/backfill-snapshots", { method: "POST" })
        .finally(() => {
          backfillInFlightRef.current = false;
          fetchHistoryRef.current(range);
        });
    }
  }, [holdings.length, demoMode, range]);

  // Fetch benchmark overlay data when benchmarks or range changes
  useEffect(() => {
    if (!benchmarks?.length || points.length < 2) {
      setBenchmarkData({});
      return;
    }
    benchmarkAbortRef.current?.abort();
    const ctrl = new AbortController();
    benchmarkAbortRef.current = ctrl;

    setBenchmarkLoading(true);
    const chartDates = points.map((p) => p.date.slice(0, 10));

    Promise.all(
      benchmarks.map(async (b) => {
        try {
          const params = new URLSearchParams({ symbol: b.symbol, period: range === "ytd" ? "1y" : range });
          const res = await fetch(`/api/historical?${params}`, { signal: ctrl.signal });
          if (!res.ok) return { key: b.key, values: [] as number[] };
          const json = await res.json();
          const raw: { date: string; close: number }[] = Array.isArray(json) ? json : json.data || [];

          const closeByDate = new Map<string, number>();
          for (const pt of raw) closeByDate.set(pt.date.slice(0, 10), pt.close);

          const aligned: number[] = [];
          let lastClose = 0;
          for (const d of chartDates) {
            const c = closeByDate.get(d);
            if (c != null && c > 0) lastClose = c;
            aligned.push(lastClose);
          }

          return { key: b.key, values: normalizeBenchmarkSeries(aligned) };
        } catch {
          return { key: b.key, values: [] as number[] };
        }
      }),
    ).then((results) => {
      if (ctrl.signal.aborted) return;
      const map: Record<string, number[]> = {};
      for (const r of results) if (r.values.length > 0) map[r.key] = r.values;
      setBenchmarkData(map);
      setBenchmarkLoading(false);
    });

    return () => ctrl.abort();
  }, [benchmarks, range, points]);

  function handleRangeChange(r: EvolutionRange) {
    if (!isPaid && !FREE_RANGES.has(r)) return;
    setRange(r);
    track("evolution_range_changed", { range: r });
  }

  function handleModeChange(m: ChartMode) {
    setChartMode(m);
    track("chart_mode_changed", { mode: m });
  }

  const hasInvestedData = points.some((p) => p.invested > 0);

  // Performance data: gain/loss % at each date relative to cost basis,
  // rebased so the first point in the selected range is 0%.
  const rawPerfPoints: PerfPoint[] = points.map((p) => ({
    date: p.date,
    pct: p.invested > 0 ? ((p.value - p.invested) / p.invested) * 100 : 0,
  }));
  const basePct = rawPerfPoints[0]?.pct ?? 0;
  const perfPoints: PerfPoint[] = rawPerfPoints.map((p) => ({
    date: p.date,
    pct: p.pct - basePct,
  }));

  const isPerf = chartMode === "performance" && hasInvestedData;

  const enrichedPoints = attachEventsToPoints(points, events);
  const enrichedPerfPoints = attachEventsToPoints(perfPoints, events);

  const hasBenchmarks = benchmarks && benchmarks.length > 0 && Object.keys(benchmarkData).length > 0;

  // When benchmarks are active in value mode, normalize portfolio to % too
  const portfolioPctFromValue: number[] = (() => {
    if (!hasBenchmarks || isPerf) return [];
    const first = points[0]?.value;
    if (!first || first <= 0) return points.map(() => 0);
    return points.map((p) => ((p.value - first) / first) * 100);
  })();

  // Merge benchmark % values into chart data for rendering
  const mergedChartData = (() => {
    if (!hasBenchmarks) return isPerf ? enrichedPerfPoints : enrichedPoints;
    // Always use performance-style data when benchmarks are active
    const base = isPerf ? enrichedPerfPoints : enrichedPoints;
    return base.map((pt, i) => {
      const extra: Record<string, number> = {};
      // Inject portfolio % when in value mode with benchmarks
      if (!isPerf && portfolioPctFromValue[i] != null) {
        extra.pct = portfolioPctFromValue[i];
      }
      for (const b of benchmarks!) {
        const vals = benchmarkData[b.key];
        if (vals && vals[i] != null) extra[`bench_${b.key}`] = vals[i];
      }
      return { ...pt, ...extra };
    });
  })();

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
  const isPositive = (periodReturn ?? 0) >= 0;

  const chartChatLayout: "default" | "terminal" | "canvas" | "studio" =
    layoutTheme === "terminal"
      ? "terminal"
      : layoutTheme === "canvas"
        ? "canvas"
        : layoutTheme === "studio"
          ? "studio"
          : "default";

  const chartAiPanel = (
    <ChartAiChatPanel
      layoutTheme={chartChatLayout}
      range={range}
      chartMode={chartMode}
      baseCurrency={baseCurrency}
      portfolioId={activePortfolioId}
      points={points}
      perfPoints={perfPoints}
      events={events}
      periodReturnPct={periodReturn}
      demoMode={demoMode}
      stealthMode={stealthMode}
    />
  );

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

  const modePills = hasInvestedData ? (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700" role="group" aria-label="Chart mode">
      {(["value", "performance"] as ChartMode[]).map((m) => {
        const isActive = chartMode === m;
        let cls: string;
        if (layoutTheme === "terminal") {
          cls = `px-2 py-0.5 text-[10px] font-mono transition-colors ${
            isActive ? "text-green-400 bg-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`;
        } else if (layoutTheme === "canvas") {
          cls = `px-2.5 py-1 text-[10px] font-medium transition-colors ${
            isActive ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
          }`;
        } else if (layoutTheme === "studio") {
          cls = `px-2.5 py-1 text-[10px] font-medium transition-colors ${
            isActive ? "bg-emerald-500 text-white" : "text-white/50 hover:text-white/80"
          }`;
        } else {
          cls = `px-2.5 py-1 text-[10px] font-medium transition-colors ${
            isActive
              ? "bg-emerald-500 text-white"
              : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          }`;
        }
        return (
          <button key={m} onClick={() => handleModeChange(m)} className={cls} aria-pressed={isActive}>
            {t(m === "value" ? "chartModeValue" : "chartModePerformance")}
          </button>
        );
      })}
    </div>
  ) : null;

  const explainerPanel = showExplainer ? (
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
  ) : null;

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
        {!isPerf && (
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
        )}
      </div>
    ) : null;

  const benchmarkTooltipEntries: BenchmarkTooltipEntry[] | undefined = hasBenchmarks
    ? benchmarks!.filter((b) => benchmarkData[b.key]).map((b) => ({ key: b.key, label: b.label, color: b.color }))
    : undefined;

  const yDomain: [number, number] = (() => {
    if (points.length < 2) return [0, 1];
    if (isPerf || hasBenchmarks) {
      const pctValues = perfPoints.map(p => p.pct);
      if (hasBenchmarks) {
        for (const vals of Object.values(benchmarkData)) {
          pctValues.push(...vals);
        }
      }
      const min = Math.min(...pctValues);
      const max = Math.max(...pctValues);
      const padding = (max - min) * 0.1 || 1;
      return [min - padding, max + padding];
    }
    const vals = points.map(p => p.value);
    if (hasInvestedData) {
      vals.push(...points.map(p => p.invested).filter(v => v > 0));
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  })();

  const chartContent = loading || backfilling ? (
    <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400 dark:text-slate-500">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
      <span>{backfilling ? t("calculatingHistory") : t("loading")}</span>
    </div>
  ) : points.length < 2 ? (
    <div className="py-12 text-center space-y-3">
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
      {!demoMode && (
        <button
          onClick={triggerBackfill}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            layoutTheme === "terminal"
              ? "text-green-400 border border-green-900 hover:bg-green-950"
              : layoutTheme === "canvas"
                ? "text-slate-600 border border-slate-300 hover:bg-slate-50"
                : layoutTheme === "studio"
                  ? "text-white/60 border border-white/20 hover:bg-white/10"
                  : "text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t("recalculateHistory")}
        </button>
      )}
    </div>
  ) : (
    <div className="h-48" role="img" aria-label={isPerf ? "Portfolio performance chart" : "Portfolio value evolution chart"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mergedChartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="evolutionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDark ? "#64748b" : "#9ca3af"} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isDark ? "#64748b" : "#9ca3af"} stopOpacity={0} />
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
            domain={yDomain}
            tick={{
              fontSize: layoutTheme === "terminal" ? 10 : 11,
              fill: layoutTheme === "terminal" ? "#52525b" : layoutTheme === "canvas" ? "#94a3b8" : layoutTheme === "studio" ? "rgba(255,255,255,0.3)" : tickFill,
              ...(layoutTheme === "terminal" ? { fontFamily: "monospace" } : {}),
            }}
            tickFormatter={(v: number) =>
              isPerf || hasBenchmarks
                ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
                : stealthMode ? "•••" : formatCurrency(v, baseCurrency)
            }
            width={70}
            axisLine={false}
            tickLine={false}
          />
          {(isPerf || hasBenchmarks) && (
            <ReferenceLine
              y={0}
              stroke={isDark ? "#475569" : "#d1d5db"}
              strokeDasharray="3 3"
            />
          )}
          <Tooltip
            content={<ChartTooltip baseCurrency={baseCurrency} stealthMode={stealthMode} mode={chartMode} t={t} benchmarkEntries={benchmarkTooltipEntries} />}
          />
          {!isPerf && !hasBenchmarks && hasInvestedData && (
            <Area
              type="monotone"
              dataKey="invested"
              stroke={isDark ? "#64748b" : "#9ca3af"}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#investedGrad)"
              dot={false}
              animationDuration={600}
            />
          )}
          <Area
            type="monotone"
            dataKey={isPerf || hasBenchmarks ? "pct" : "value"}
            stroke={accentColor}
            strokeWidth={2}
            fill="url(#evolutionGrad)"
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, index, payload } = props as {
                cx: number;
                cy: number;
                index: number;
                payload: { events?: EventMarker[] };
              };
              const evts = payload?.events;
              if (!evts?.length) return <g key={`ed-${index}`} />;
              const MAX = 6;
              const show = evts.slice(0, MAX);
              const extra = evts.length - MAX;
              return (
                <g key={`ed-${index}`}>
                  {show.map((e, i) => (
                    <circle
                      key={e.id || `${e.type}-${e.ticker}-${i}`}
                      cx={cx + (i - (show.length - 1) / 2) * 5.5}
                      cy={cy}
                      r={3.2}
                      fill={eventMarkerFill(e.type)}
                      stroke={isDark ? "#1e293b" : "#ffffff"}
                      strokeWidth={1.5}
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                    />
                  ))}
                  {extra > 0 && (
                    <text
                      x={cx}
                      y={cy - 9}
                      textAnchor="middle"
                      fontSize={9}
                      fill={isDark ? "#94a3b8" : "#64748b"}
                      fontWeight={600}
                    >
                      +
                      {extra}
                    </text>
                  )}
                </g>
              );
            }}
            animationDuration={600}
          />
          {hasBenchmarks && benchmarks!.map((b) =>
            benchmarkData[b.key] ? (
              <Line
                key={b.key}
                type="monotone"
                dataKey={`bench_${b.key}`}
                stroke={b.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                animationDuration={400}
                connectNulls
              />
            ) : null,
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const benchmarkLegend = hasBenchmarks ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {t("portfolio")}
      </span>
      {benchmarks!.filter((b) => benchmarkData[b.key]).map((b) => (
        <button
          key={b.key}
          onClick={() => onRemoveBenchmark?.(b.key)}
          className="group inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors"
          style={{
            background: `${b.color}15`,
            color: b.color,
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
          {b.label}
          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>
      ))}
      {benchmarkLoading && (
        <span className="animate-spin w-3 h-3 border-b border-current rounded-full opacity-40" />
      )}
    </div>
  ) : null;

  const subtitle = isPerf ? t("chartPerformanceSubtitle") : t("chartValueSubtitle");

  const infoButton = (
    <button
      onClick={() => setShowExplainer((v) => !v)}
      className={`p-1 rounded-full transition-colors ${
        layoutTheme === "terminal"
          ? "text-zinc-600 hover:text-green-400"
          : layoutTheme === "canvas"
            ? "text-slate-400 hover:text-slate-600"
            : layoutTheme === "studio"
              ? "text-white/30 hover:text-white/60"
              : "text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400"
      }`}
      aria-label="Chart info"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );

  const recalcButton = !demoMode ? (
    <button
      onClick={triggerBackfill}
      disabled={backfilling}
      title={t("recalculateHistoryDesc")}
      className={`p-1 rounded-full transition-colors ${
        backfilling ? "animate-spin" : ""
      } ${
        layoutTheme === "terminal"
          ? "text-zinc-600 hover:text-green-400"
          : layoutTheme === "canvas"
            ? "text-slate-400 hover:text-slate-600"
            : layoutTheme === "studio"
              ? "text-white/30 hover:text-white/60"
              : "text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400"
      }`}
      aria-label={t("recalculateHistory")}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  ) : null;

  /* ── TERMINAL ── */
  if (layoutTheme === "terminal") {
    return (
      <div className="border-b border-zinc-800 py-3 space-y-2" data-testid="evolution-chart-terminal">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">
              {t("performance")}
            </span>
            {infoButton}
            {recalcButton}
          </div>
          <div className="flex items-center gap-2">
            {modePills}
            {rangePills}
          </div>
        </div>
        <p className="text-[9px] text-zinc-700 font-mono">{subtitle}</p>
        {explainerPanel}
        {periodReturnEl}
        {chartContent}
        {chartAiPanel}
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {t("performance")}
            </h3>
            {infoButton}
            {recalcButton}
          </div>
          <div className="flex items-center gap-2">
            {modePills}
            {rangePills}
          </div>
        </div>
        <p className="text-[10px] text-slate-400">{subtitle}</p>
        {explainerPanel}
        {periodReturnEl}
        {chartContent}
        {chartAiPanel}
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
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              {t("performance")}
            </h3>
            {infoButton}
            {recalcButton}
          </div>
          <div className="flex items-center gap-2">
            {modePills}
            {rangePills}
          </div>
        </div>
        <p className="text-[9px] text-white/30">{subtitle}</p>
        {explainerPanel}
        {periodReturnEl}
        {chartContent}
        {chartAiPanel}
      </div>
    );
  }

  /* ── DEFAULT ── */
  return (
    <div className={embedded ? "px-5 pb-4 space-y-3" : "card px-5 py-4 space-y-3"} data-testid="evolution-chart">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3
            className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"
            style={{ fontSize: "var(--text-body)" }}
          >
            {t("performance")}
            <TierFeatureBadge requiredPlan="starter" size="sm" />
          </h3>
          {infoButton}
          {recalcButton}
        </div>
        <div className="flex items-center gap-2">
          {modePills}
          {rangePills}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-slate-500">{subtitle}</p>
      {explainerPanel}
      {periodReturnEl}
      {chartContent}
      {benchmarkLegend}
      {!embedded && chartAiPanel}
    </div>
  );
}
