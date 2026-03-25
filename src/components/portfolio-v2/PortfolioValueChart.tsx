"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  isAnyMarketActive,
  getNextMarketOpen,
  getPortfolioMarketSessions,
} from "@/lib/market-hours";
import type { ChartMarketSession } from "@/lib/market-hours";
import { OVERLAY_BENCHMARKS } from "@/components/dashboard-v2/BenchmarkDropdown";
import type { BenchmarkDef } from "@/components/dashboard-v2/BenchmarkDropdown";
import BenchmarkDropdown from "@/components/dashboard-v2/BenchmarkDropdown";
import RangeSelector from "./RangeSelector";
import type { EvolutionRange } from "./RangeSelector";
import ChartTooltip from "./ChartTooltip";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { Holding } from "@/lib/types";

// ── Types ──

export interface BenchmarkOverlayEntry {
  key: string;
  symbol: string;
  label: string;
  color: string;
}

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
  stockValue: number;
  etfValue: number;
  cryptoValue: number;
}

interface ChartPoint {
  date: string;
  value?: number;
  pct?: number;
  [key: string]: unknown;
}

const ASSET_FILTER_LINE_COLORS: Record<AssetFilter, string> = {
  all: "#10b981",
  stock: "#6366f1",
  etf: "#f59e0b",
  crypto: "#ec4899",
};

const BENCHMARK_STORAGE_KEY = "trefolio-benchmark-overlay-v1";

const RANGE_MAP_API: Record<EvolutionRange, string> = {
  "1d": "1d",
  "1w": "1w",
  "3m": "3m",
  "6m": "6m",
  ytd: "ytd",
  "1y": "1y",
};

const BENCHMARK_PERIOD_MAP: Record<EvolutionRange, string> = {
  "1d": "1d",
  "1w": "1w",
  "3m": "3m",
  "6m": "6m",
  ytd: "1y",
  "1y": "1y",
};

// ── Helpers ──

function parseTime(dateStr: string): number {
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T")).getTime();
}

function formatDateLabel(dateStr: string, isIntraday: boolean): string {
  const hasTime = dateStr.includes(" ") || dateStr.includes("T");
  if (hasTime) {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isIntraday) return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  }
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function toAlignKey(dateStr: string): string {
  const hasTime = dateStr.includes(" ") || dateStr.includes("T");
  if (!hasTime) return dateStr;
  const d = new Date(dateStr.replace(" ", "T"));
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
  return d.toISOString().slice(0, 16);
}

/**
 * Generate 5-minute placeholder ticks with undefined values so the x-axis
 * spans the full range while the curve only draws where real data exists.
 */
function generatePaddingTicks(fromMs: number, toMs: number, step: number = 5 * 60 * 1000): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (let t = fromMs; t <= toMs; t += step) {
    out.push({ date: new Date(t).toISOString() });
  }
  return out;
}

interface ClosedZone {
  x1: string;
  x2: string;
}

/**
 * From market session overlays, derive the zones where no market is open.
 * Returns bands for: before first open, gaps between non-overlapping sessions,
 * and after the last close until dayEndIso.
 */
function computeClosedZones(
  sessions: ChartMarketSession[],
  dayStartIso: string,
  dayEndIso: string,
): ClosedZone[] {
  if (sessions.length === 0) return [{ x1: dayStartIso, x2: dayEndIso }];

  const sorted = [...sessions].sort((a, b) => a.openDate.getTime() - b.openDate.getTime());

  const merged: { open: number; close: number }[] = [];
  for (const s of sorted) {
    const o = s.openDate.getTime();
    const c = s.closeDate.getTime();
    if (merged.length > 0 && o <= merged[merged.length - 1].close) {
      merged[merged.length - 1].close = Math.max(merged[merged.length - 1].close, c);
    } else {
      merged.push({ open: o, close: c });
    }
  }

  const zones: ClosedZone[] = [];
  const dayStartMs = parseTime(dayStartIso);
  const dayEndMs = parseTime(dayEndIso);

  if (merged[0].open > dayStartMs) {
    zones.push({ x1: dayStartIso, x2: new Date(merged[0].open).toISOString() });
  }

  for (let i = 0; i < merged.length - 1; i++) {
    if (merged[i + 1].open > merged[i].close) {
      zones.push({
        x1: new Date(merged[i].close).toISOString(),
        x2: new Date(merged[i + 1].open).toISOString(),
      });
    }
  }

  const lastClose = merged[merged.length - 1].close;
  if (lastClose < dayEndMs) {
    zones.push({ x1: new Date(lastClose).toISOString(), x2: dayEndIso });
  }

  return zones;
}

function computeWeekendBands(points: ChartPoint[]): { x1: string; x2: string }[] {
  if (points.length < 2) return [];
  const bands: { x1: string; x2: string }[] = [];
  let weekendStart: string | null = null;

  for (const p of points) {
    const d = new Date(p.date.replace(" ", "T"));
    const dow = d.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend && !weekendStart) {
      weekendStart = p.date;
    } else if (!isWeekend && weekendStart) {
      bands.push({ x1: weekendStart, x2: p.date });
      weekendStart = null;
    }
  }
  if (weekendStart) bands.push({ x1: weekendStart, x2: points[points.length - 1].date });
  return bands;
}

// ── Component ──

interface Props {
  holdings: Holding[];
  assetFilter: AssetFilter;
  /** Called after backfill completes to refetch */
  refreshKey?: number;
}

export default function PortfolioValueChart({ holdings, assetFilter, refreshKey }: Props) {
  const { activePortfolioId, activePortfolioCurrency, mutationVersion } = usePortfolio();
  const { user } = useAuth();
  const { stealthMode } = useStealthMode();
  const { t } = useI18n();
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  const isAdmin = user?.role === "admin";

  const [range, setRange] = useState<EvolutionRange>("1d");
  const [mode, setMode] = useState<"value" | "performance">("value");
  const [debugDate, setDebugDate] = useState<string | null>(null);
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmarkKeys, setBenchmarkKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(BENCHMARK_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [benchmarkData, setBenchmarkData] = useState<Record<string, Record<string, number>>>({});
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  const fetchVersionRef = useRef(0);

  const portfolioId = activePortfolioId ?? "";
  const baseCurrency = activePortfolioCurrency;
  const lineColor = ASSET_FILTER_LINE_COLORS[assetFilter];

  // ── Fetch history ──

  const fetchHistory = useCallback(async (r: EvolutionRange, dateOverride?: string | null) => {
    const version = ++fetchVersionRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: RANGE_MAP_API[r], portfolioId });
      if (r === "1d" && dateOverride) params.set("date", dateOverride);
      const res = await fetch(`/api/portfolio/history?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (version !== fetchVersionRef.current) return;
      setPoints(data.points ?? []);
    } catch {
      if (version === fetchVersionRef.current) setPoints([]);
    } finally {
      if (version === fetchVersionRef.current) setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    if (!isPaid && !["1d", "1w"].includes(range)) {
      setRange("1d");
      return;
    }
    fetchHistory(range, range === "1d" ? debugDate : null);
  }, [range, isPaid, fetchHistory, mutationVersion, refreshKey, debugDate]);

  // ── Auto-refresh for 1D (every 5 min) ──

  useEffect(() => {
    if (range !== "1d" || debugDate) return;
    const interval = setInterval(() => fetchHistory("1d"), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [range, fetchHistory, debugDate]);

  // ── Fetch benchmarks ──

  const benchmarkEntries: BenchmarkOverlayEntry[] = useMemo(
    () =>
      benchmarkKeys
        .map((k) => OVERLAY_BENCHMARKS.find((b: BenchmarkDef) => b.key === k))
        .filter((b): b is BenchmarkDef => !!b)
        .map((b) => ({ key: b.key, symbol: b.symbol, label: b.labelKey, color: b.color })),
    [benchmarkKeys],
  );

  useEffect(() => {
    if (benchmarkEntries.length === 0) {
      setBenchmarkData({});
      return;
    }
    let cancelled = false;
    const period = BENCHMARK_PERIOD_MAP[range];

    Promise.all(
      benchmarkEntries.map(async (b) => {
        const res = await fetch(`/api/historical?symbol=${encodeURIComponent(b.symbol)}&period=${period}`);
        if (!res.ok) return { key: b.key, data: {} };
        const json = await res.json();
        const pts: { date: string; close: number }[] = json.data ?? [];
        if (pts.length === 0) return { key: b.key, data: {} };
        const first = pts[0].close;
        const mapped: Record<string, number> = {};
        for (const p of pts) {
          mapped[toAlignKey(p.date)] = ((p.close - first) / first) * 100;
        }
        return { key: b.key, data: mapped };
      }),
    ).then((results) => {
      if (cancelled) return;
      const merged: Record<string, Record<string, number>> = {};
      for (const r of results) merged[r.key] = r.data;
      setBenchmarkData(merged);
    });

    return () => { cancelled = true; };
  }, [benchmarkEntries, range, points.length]);

  // ── Persist benchmark selection ──

  useEffect(() => {
    try {
      localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(benchmarkKeys));
    } catch {}
  }, [benchmarkKeys]);

  // ── Derive chart data ──

  const isFilteredSingle = assetFilter !== "all";

  const effectivePoints: SnapshotPoint[] = useMemo(() => {
    if (!isFilteredSingle) return points;
    const key = assetFilter === "stock" ? "stockValue" : assetFilter === "etf" ? "etfValue" : "cryptoValue";
    return points.map((p) => {
      const perTypeSum = (p.stockValue ?? 0) + (p.etfValue ?? 0) + (p.cryptoValue ?? 0);
      const hasPerType = perTypeSum > 0;
      return { ...p, value: hasPerType ? (p[key] ?? 0) : p.value };
    });
  }, [points, isFilteredSingle, assetFilter]);

  const hasBenchmarks = benchmarkEntries.length > 0 && Object.keys(benchmarkData).length > 0;
  const showPerformance = mode === "performance" || hasBenchmarks;

  // ── Market hours (must come before chartData which depends on sessionOverlays) ──

  const relevantHoldings = useMemo(() => {
    if (assetFilter === "all") return holdings;
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const allMarketsClosed = useMemo(
    () => range === "1d" && !isAnyMarketActive(relevantHoldings),
    [range, relevantHoldings],
  );

  const nextOpen = useMemo(() => {
    if (!allMarketsClosed) return null;
    return getNextMarketOpen(relevantHoldings);
  }, [allMarketsClosed, relevantHoldings]);

  const sessionOverlays: ChartMarketSession[] = useMemo(() => {
    if (range !== "1d" || holdings.length === 0) return [];
    const refDay = debugDate ? new Date(debugDate + "T12:00:00") : new Date();
    return getPortfolioMarketSessions(holdings, refDay);
  }, [range, holdings, debugDate]);

  // ── Full-day boundaries for 1D (earliest open → latest close) ──

  const dayBounds = useMemo(() => {
    if (range !== "1d") return null;
    if (sessionOverlays.length > 0) {
      const startMs = Math.min(...sessionOverlays.map((s) => s.openDate.getTime()));
      const endMs = Math.max(...sessionOverlays.map((s) => s.closeDate.getTime()));
      return {
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(endMs).toISOString(),
        startMs,
        endMs,
      };
    }
    const refDate = debugDate || new Date().toISOString().slice(0, 10);
    const startMs = new Date(refDate + "T00:00:00Z").getTime();
    const endMs = new Date(refDate + "T23:59:00Z").getTime();
    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
      startMs,
      endMs,
    };
  }, [range, sessionOverlays, debugDate]);

  // ── Closed-market zones for 1D (not shown when crypto is in view) ──

  const hasCryptoInView = assetFilter === "crypto" ||
    (assetFilter === "all" && holdings.some((h) => h.assetType === "crypto"));

  const closedZones = useMemo((): ClosedZone[] => {
    if (range !== "1d" || !dayBounds || hasCryptoInView) return [];
    return computeClosedZones(sessionOverlays, dayBounds.startIso, dayBounds.endIso);
  }, [range, sessionOverlays, dayBounds, hasCryptoInView]);

  // ── Derive chart data ──

  const chartData: ChartPoint[] = useMemo(() => {
    if (effectivePoints.length === 0) return [];
    const firstValue = effectivePoints[0].value;

    const realPoints: ChartPoint[] = effectivePoints.map((p) => {
      const point: ChartPoint = {
        date: p.date,
        value: p.value,
        pct: firstValue > 0 ? ((p.value - firstValue) / firstValue) * 100 : 0,
      };

      if (hasBenchmarks) {
        const alignKey = toAlignKey(p.date);
        for (const b of benchmarkEntries) {
          const bData = benchmarkData[b.key];
          if (bData) {
            const match = bData[alignKey] ?? bData[p.date.slice(0, 10)];
            if (match != null) point[`bench_${b.key}`] = match;
          }
        }
      }
      return point;
    });

    if (range !== "1d" || !dayBounds) return realPoints;

    const FIVE_MIN = 5 * 60 * 1000;

    const hasCrypto = assetFilter === "crypto" ||
      (assetFilter === "all" && holdings.some((h) => h.assetType === "crypto"));

    const openRanges = sessionOverlays.map((s) => ({
      start: s.openDate.getTime(),
      end: s.closeDate.getTime(),
    }));

    const shouldMask = !hasCrypto && openRanges.length > 0;

    const isInOpenSession = (ms: number) =>
      openRanges.some((r) => ms >= r.start && ms <= r.end);

    const masked = shouldMask
      ? realPoints.map((p) => {
          const ms = parseTime(p.date);
          if (!isInOpenSession(ms)) return { date: p.date } as ChartPoint;
          return p;
        })
      : realPoints;

    const result: ChartPoint[] = [];

    const firstRealMs = parseTime(masked[0].date);
    if (firstRealMs > dayBounds.startMs + FIVE_MIN) {
      result.push(...generatePaddingTicks(dayBounds.startMs, firstRealMs - FIVE_MIN));
    }

    result.push(...masked);

    const lastRealMs = parseTime(masked[masked.length - 1].date);
    if (dayBounds.endMs > lastRealMs + FIVE_MIN) {
      result.push(...generatePaddingTicks(lastRealMs + FIVE_MIN, dayBounds.endMs));
    }

    return result;
  }, [effectivePoints, hasBenchmarks, benchmarkEntries, benchmarkData, range, dayBounds, sessionOverlays, assetFilter, holdings]);

  const weekendBands = useMemo(() => {
    if (range === "1d") return [];
    return computeWeekendBands(chartData);
  }, [range, chartData]);

  // ── Y domain ──

  const dataKey = showPerformance ? "pct" : "value";

  const yDomain = useMemo((): [number, number] => {
    const vals = chartData.map((p) => (showPerformance ? p.pct : p.value)).filter((v): v is number => v != null);
    if (vals.length === 0) return [0, 100];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08 || 1;
    return [min - pad, max + pad];
  }, [chartData, showPerformance]);

  // ── Period return ──

  const periodReturn = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const lastWithValue = [...chartData].reverse().find((p) => p.value != null);
    const last = lastWithValue?.value;
    if (first == null || last == null || first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  // ── Render ──

  const isIntraday = range === "1d";

  if (loading && points.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="h-[340px] flex items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  const showMarketsClosedOverlay = allMarketsClosed && !hasCryptoInView && range === "1d";

  if (showMarketsClosedOverlay) {
    const lastValue = effectivePoints.length > 0 ? effectivePoints[effectivePoints.length - 1].value : null;
    return (
      <div className="card overflow-hidden">
        <div className="relative h-[340px] flex flex-col items-center justify-center text-center gap-2.5">
          {/* Faint grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "linear-gradient(to right, var(--grid-line, rgba(148,163,184,0.3)) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line, rgba(148,163,184,0.3)) 1px, transparent 1px)",
              backgroundSize: "80px 40px",
              borderRadius: "12px",
            }}
          />
          <span className="text-3xl relative z-10">🧘</span>
          <p className="text-sm font-semibold relative z-10 text-amber-500 dark:text-amber-400">
            {t("marketsClosedTitle")}
          </p>
          <p className="text-xs relative z-10 max-w-xs leading-relaxed text-gray-500 dark:text-slate-400">
            {t("marketsClosedBody").replace(
              "{value}",
              stealthMode ? "•••••" : formatCurrency(lastValue ?? 0, baseCurrency),
            )}
          </p>
          {nextOpen && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full relative z-10 text-gray-400 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
              {t("marketsClosedOpens").replace("{market}", nextOpen.market).replace("{time}", nextOpen.time)}
            </span>
          )}
        </div>
        <ChartFooter
          mode={mode}
          setMode={setMode}
          range={range}
          setRange={setRange}
          benchmarkKeys={benchmarkKeys}
          benchmarkEntries={benchmarkEntries}
          setBenchmarkKeys={setBenchmarkKeys}
          showCompareDropdown={showCompareDropdown}
          setShowCompareDropdown={setShowCompareDropdown}
          periodReturn={null}
        />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Chart */}
      <div className="h-[340px] px-2 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="pv2-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
              <pattern id="pv2-weekend" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--weekend-hatch, rgba(148,163,184,0.08))" strokeWidth="2" />
              </pattern>
              <pattern id="pv2-closed-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--closed-hatch, rgba(148,163,184,0.18))" strokeWidth="1" />
              </pattern>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid, rgba(148,163,184,0.08))" />

            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDateLabel(d, isIntraday)}
              tick={{ fontSize: 10, fill: "var(--axis, rgba(148,163,184,0.5))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v: number) =>
                showPerformance
                  ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
                  : stealthMode
                    ? "•••"
                    : formatCurrency(v, baseCurrency)
              }
              tick={{ fontSize: 10, fill: "var(--axis, rgba(148,163,184,0.5))" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />

            <Tooltip
              content={
                <ChartTooltip
                  mode={showPerformance ? "performance" : "value"}
                  baseCurrency={baseCurrency}
                  stealthMode={stealthMode}
                  benchmarkEntries={benchmarkEntries}
                  holdings={holdings}
                  range={range}
                />
              }
              cursor={{ stroke: "var(--cursor, rgba(148,163,184,0.2))", strokeDasharray: "3 3" }}
            />

            {/* Weekend bands */}
            {weekendBands.map((band, i) => (
              <ReferenceArea
                key={`we-${i}`}
                x1={band.x1}
                x2={band.x2}
                fill="url(#pv2-weekend)"
                fillOpacity={1}
                ifOverflow="visible"
              />
            ))}

            {/* Market session bands (1D) */}
            {sessionOverlays.map((s, i) => (
              <ReferenceArea
                key={`session-${i}`}
                x1={s.openDate.toISOString()}
                x2={s.closeDate.toISOString()}
                fill={s.color}
                fillOpacity={0.05}
                ifOverflow="visible"
              />
            ))}

            {/* Closed-market hatched zones (1D) */}
            {closedZones.map((zone, i) => (
              <ReferenceArea
                key={`closed-${i}`}
                x1={zone.x1}
                x2={zone.x2}
                fill="url(#pv2-closed-hatch)"
                fillOpacity={1}
                ifOverflow="visible"
                label={closedZones.length <= 3 ? {
                  value: "Market closed",
                  position: "insideTop" as const,
                  fill: "var(--closed-label, rgba(148,163,184,0.5))",
                  fontSize: 10,
                  fontWeight: 500,
                  dy: 12,
                } : undefined}
              />
            ))}

            {/* Main area */}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#pv2-grad)"
              fillOpacity={0.8}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: lineColor }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Benchmark lines */}
            {benchmarkEntries.map((b) => (
              <Line
                key={b.key}
                type="monotone"
                dataKey={`bench_${b.key}`}
                stroke={b.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Market sessions bar (1D) */}
      {range === "1d" && sessionOverlays.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-2 border-t border-gray-100 dark:border-white/[0.04] text-[11px] text-gray-500 dark:text-slate-500 overflow-x-auto">
          {sessionOverlays.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-gray-600 dark:text-slate-400">{s.name}</span>
              <span>{s.openLabel} – {s.closeLabel}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <ChartFooter
        mode={mode}
        setMode={setMode}
        range={range}
        setRange={setRange}
        benchmarkKeys={benchmarkKeys}
        benchmarkEntries={benchmarkEntries}
        setBenchmarkKeys={setBenchmarkKeys}
        showCompareDropdown={showCompareDropdown}
        setShowCompareDropdown={setShowCompareDropdown}
        periodReturn={periodReturn}
      />

      {/* Sync status */}
      {range === "1d" && (
        <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 dark:border-white/[0.04] text-[11px] text-gray-500 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            {debugDate ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {debugDate ? `Viewing ${debugDate}` : loading ? "Syncing…" : "Live"}
          </div>
          <span>{debugDate ? "Debug mode" : "Updates every 5 min"}</span>
        </div>
      )}

      {/* Admin time-travel (1D only) */}
      {isAdmin && range === "1d" && (
        <div className="flex items-center justify-center gap-3 px-5 py-1.5 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-[11px]">
          <span className="text-amber-600 dark:text-amber-400 font-semibold">Admin</span>
          <button
            onClick={() => {
              const base = debugDate || new Date().toISOString().slice(0, 10);
              const d = new Date(base + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() - 1);
              setDebugDate(d.toISOString().slice(0, 10));
            }}
            className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
          >
            &larr; Prev day
          </button>
          <span className="text-amber-600 dark:text-amber-400 tabular-nums font-medium min-w-[80px] text-center">
            {debugDate || "Today"}
          </span>
          <button
            onClick={() => {
              if (!debugDate) return;
              const d = new Date(debugDate + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() + 1);
              const next = d.toISOString().slice(0, 10);
              const today = new Date().toISOString().slice(0, 10);
              setDebugDate(next >= today ? null : next);
            }}
            disabled={!debugDate}
            className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next day &rarr;
          </button>
          {debugDate && (
            <button
              onClick={() => setDebugDate(null)}
              className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-700/40 text-amber-800 dark:text-amber-200 font-semibold hover:bg-amber-300 dark:hover:bg-amber-700/60 transition-colors"
            >
              Back to live
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart Footer sub-component ──

interface ChartFooterProps {
  mode: "value" | "performance";
  setMode: (m: "value" | "performance") => void;
  range: EvolutionRange;
  setRange: (r: EvolutionRange) => void;
  benchmarkKeys: string[];
  benchmarkEntries: BenchmarkOverlayEntry[];
  setBenchmarkKeys: (k: string[]) => void;
  showCompareDropdown: boolean;
  setShowCompareDropdown: (v: boolean) => void;
  periodReturn: number | null;
}

function ChartFooter({
  mode,
  setMode,
  range,
  setRange,
  benchmarkKeys,
  benchmarkEntries,
  setBenchmarkKeys,
  showCompareDropdown,
  setShowCompareDropdown,
  periodReturn,
}: ChartFooterProps) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 dark:border-white/[0.04] flex-wrap gap-2">
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-gray-100/60 dark:bg-white/[0.04] p-0.5">
          <button
            onClick={() => setMode("value")}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
              mode === "value"
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-500"
            }`}
          >
            Value
          </button>
          <button
            onClick={() => setMode("performance")}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
              mode === "performance"
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-500"
            }`}
          >
            Performance
          </button>
        </div>

        <RangeSelector value={range} onChange={setRange} />

        {periodReturn != null && (
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              periodReturn >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {periodReturn >= 0 ? "+" : ""}
            {periodReturn.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Benchmark chips */}
        {benchmarkEntries.map((b) => (
          <span
            key={b.key}
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-slate-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06]"
            onClick={() => setBenchmarkKeys(benchmarkKeys.filter((k) => k !== b.key))}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.color }} />
            {b.label}
            <span className="text-gray-400 dark:text-slate-600 ml-0.5">&times;</span>
          </span>
        ))}

        {/* Compare button */}
        <div className="relative">
          <button
            onClick={() => setShowCompareDropdown(!showCompareDropdown)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-blue-400/40 hover:text-blue-500 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-8" />
            </svg>
            Compare
          </button>
          <BenchmarkDropdown
            selected={benchmarkKeys}
            onChange={setBenchmarkKeys}
            isOpen={showCompareDropdown}
            onClose={() => setShowCompareDropdown(false)}
          />
        </div>
      </div>
    </div>
  );
}
