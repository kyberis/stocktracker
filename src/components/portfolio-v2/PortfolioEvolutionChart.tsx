"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChartGuideModal from "./ChartGuideModal";
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
  ReferenceLine,
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
import type {
  BenchmarkOverlayEntry,
  EventMarker,
  SpikeContributor,
  SpikeDetail,
  SpikeTypeBreakdown,
} from "./portfolio-chart-types";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
  stockValue: number;
  etfValue: number;
  fundValue: number;
  cryptoValue: number;
}

interface ChartPoint {
  date: string;
  value?: number;
  pct?: number;
  spike?: number;
  spikeDetail?: SpikeDetail;
  stockValue?: number;
  etfValue?: number;
  fundValue?: number;
  cryptoValue?: number;
  events?: EventMarker[];
  [key: string]: unknown;
}

function eventDotFill(type: string): string {
  return type === "sell" ? "#ef4444" : "#10b981";
}

function attachEventsToPoints(pts: ChartPoint[], evts: EventMarker[]): ChartPoint[] {
  if (!evts.length || !pts.length) return pts;
  const result = pts.map((p) => ({ ...p }));

  for (const evt of evts) {
    const evtMs = new Date(evt.date).getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < result.length; i++) {
      if (result[i].value == null) continue;
      const pMs = new Date(result[i].date.replace(" ", "T")).getTime();
      const diff = Math.abs(pMs - evtMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    const target = result[bestIdx];
    if (!target.events) target.events = [];
    target.events.push(evt);
  }
  return result;
}

const ASSET_FILTER_LINE_COLORS: Record<AssetFilter, string> = {
  all: "#10b981",
  stock: "#6366f1",
  etf: "#f59e0b",
  fund: "#14b8a6",
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

function toAlignKey(dateStr: string, intraday: boolean): string {
  if (!intraday) return dateStr.slice(0, 10);
  const s = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return dateStr.slice(0, 10);
  const mins = Math.floor(d.getTime() / 300000) * 300000;
  return new Date(mins).toISOString().slice(0, 16);
}

function normalizeBenchmarkSeries(values: number[]): number[] {
  if (values.length === 0) return [];
  const firstRealIdx = values.findIndex((v) => v > 0);
  if (firstRealIdx < 0) return values.map(() => 0);
  const base = values[firstRealIdx];
  return values.map((v, i) => (i < firstRealIdx || v <= 0 ? 0 : ((v - base) / base) * 100));
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

/**
 * Find the date string in chartData closest to `targetMs`.
 * Recharts categorical XAxis needs an exact string match, so we must
 * return a value that actually exists in the data array.
 */
function findClosestDataDate(chartData: { date: string }[], targetMs: number): string | null {
  if (chartData.length === 0) return null;
  let best = chartData[0].date;
  let bestDiff = Math.abs(parseTime(best) - targetMs);
  for (let i = 1; i < chartData.length; i++) {
    const d = chartData[i].date;
    const diff = Math.abs(parseTime(d) - targetMs);
    if (diff < bestDiff) {
      best = d;
      bestDiff = diff;
    }
    if (diff > bestDiff) break;
  }
  return best;
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
  refreshKey?: number;
  onRecalculate?: () => void;
  recalculating?: boolean;
  onOpenAi?: () => void;
}

export default function PortfolioEvolutionChart({
  holdings,
  assetFilter,
  refreshKey,
  onRecalculate,
  recalculating,
  onOpenAi,
}: Props) {
  const { activePortfolioId, activePortfolioCurrency, mutationVersion, quotes, demoMode } = usePortfolio();
  const { user } = useAuth();
  const { stealthMode } = useStealthMode();
  const { t } = useI18n();
  const isPaid = user?.plan === "pro";

  const isAdmin = user?.role === "admin";

  const [range, setRange] = useState<EvolutionRange>("1d");
  const [mode, setMode] = useState<"value" | "performance">("value");
  const [showGuide, setShowGuide] = useState(false);
  const [debugDate, setDebugDate] = useState<string | null>(null);
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmarkKeys, setBenchmarkKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(BENCHMARK_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [benchmarkData, setBenchmarkData] = useState<Record<string, number[]>>({});
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  const fetchVersionRef = useRef(0);

  const portfolioId = activePortfolioId ?? "";
  const baseCurrency = activePortfolioCurrency;
  const lineColor = ASSET_FILTER_LINE_COLORS[assetFilter];

  // ── Fetch history ──

  const fetchHistory = useCallback(async (r: EvolutionRange, dateOverride?: string | null) => {
    if (demoMode) {
      setPoints([]);
      setEvents([]);
      setLoading(false);
      return;
    }
    const version = ++fetchVersionRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: RANGE_MAP_API[r], portfolioId });
      if (r === "1d" && dateOverride) params.set("date", dateOverride);
      const res = await fetchWithAuthRedirect(`/api/portfolio/history?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (version !== fetchVersionRef.current) return;
      setPoints(data.points ?? []);
      const allEvents: EventMarker[] = Array.isArray(data.events) ? data.events : [];
      setEvents(allEvents.filter((e) => e.type === "buy" || e.type === "sell"));
    } catch {
      if (version === fetchVersionRef.current) {
        setPoints([]);
        setEvents([]);
      }
    } finally {
      if (version === fetchVersionRef.current) setLoading(false);
    }
  }, [demoMode, portfolioId]);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      setPoints([]);
      setEvents([]);
      return;
    }
    if (activePortfolioId == null) {
      setLoading(false);
      setPoints([]);
      setEvents([]);
    }
  }, [activePortfolioId, demoMode]);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      setPoints([]);
      setEvents([]);
      return;
    }
    if (activePortfolioId == null) {
      setLoading(false);
      setPoints([]);
      setEvents([]);
      return;
    }
    if (!isPaid && !["1d", "1w"].includes(range)) {
      setRange("1d");
      return;
    }
    fetchHistory(range, range === "1d" ? debugDate : null);
  }, [activePortfolioId, range, isPaid, fetchHistory, mutationVersion, refreshKey, debugDate, demoMode]);

  // ── Auto-refresh for 1D (every 5 min) ──

  useEffect(() => {
    if (demoMode) return;
    if (activePortfolioId == null || range !== "1d" || debugDate) return;
    const interval = setInterval(() => fetchHistory("1d"), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activePortfolioId, range, fetchHistory, debugDate, demoMode]);

  // ── Derive effective points (must be before benchmark fetch) ──

  const isFilteredSingle = assetFilter !== "all";

  const effectivePoints: SnapshotPoint[] = useMemo(() => {
    return points.map((p) => {
      const perTypeSum = (p.stockValue ?? 0) + (p.etfValue ?? 0) + (p.fundValue ?? 0) + (p.cryptoValue ?? 0);
      const hasPerType = perTypeSum > 0;
      if (!hasPerType) return p;

      if (isFilteredSingle) {
        const key =
          assetFilter === "stock" ? "stockValue"
          : assetFilter === "etf" ? "etfValue"
          : assetFilter === "fund" ? "fundValue"
          : "cryptoValue";
        return { ...p, value: p[key] ?? 0 };
      }

      // "All" view: use holdings-only sum so the chart stays consistent with
      // historical backfill snapshots (which never include manual cash/assets).
      return { ...p, value: perTypeSum };
    });
  }, [points, isFilteredSingle, assetFilter]);

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
    if (demoMode) {
      setBenchmarkData({});
      return;
    }
    if (benchmarkEntries.length === 0 || effectivePoints.length < 2) {
      setBenchmarkData({});
      return;
    }
    let cancelled = false;
    const period = BENCHMARK_PERIOD_MAP[range];
    const isIntraday = range === "1d" || range === "1w";
    const chartKeys = effectivePoints.map((p) => toAlignKey(p.date, isIntraday));

    Promise.all(
      benchmarkEntries.map(async (b) => {
        try {
          const res = await fetchWithAuthRedirect(`/api/historical?symbol=${encodeURIComponent(b.symbol)}&period=${period}`);
          if (!res.ok) return { key: b.key, values: [] as number[] };
          const json = await res.json();
          const raw: { date: string; close: number }[] = Array.isArray(json) ? json : json.data || [];

          const closeByKey = new Map<string, number>();
          for (const pt of raw) closeByKey.set(toAlignKey(pt.date, isIntraday), pt.close);

          const firstChartKey = chartKeys[0];
          const sortedBenchKeys = [...closeByKey.keys()].sort();
          let lastClose = 0;
          for (const bk of sortedBenchKeys) {
            if (bk <= firstChartKey && (closeByKey.get(bk) ?? 0) > 0) {
              lastClose = closeByKey.get(bk)!;
            }
          }

          const aligned: number[] = [];
          for (let i = 0; i < chartKeys.length; i++) {
            const c = closeByKey.get(chartKeys[i]);
            if (c != null && c > 0) lastClose = c;
            aligned.push(lastClose);
          }

          return { key: b.key, values: normalizeBenchmarkSeries(aligned) };
        } catch {
          return { key: b.key, values: [] as number[] };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, number[]> = {};
      for (const r of results) {
        if (r.values.length > 0) map[r.key] = r.values;
      }
      setBenchmarkData(map);
    });

    return () => { cancelled = true; };
  }, [benchmarkEntries, range, effectivePoints, demoMode]);

  // ── Persist benchmark selection ──

  useEffect(() => {
    try {
      localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(benchmarkKeys));
    } catch {}
  }, [benchmarkKeys]);

  const hasBenchmarks = benchmarkEntries.length > 0 && Object.keys(benchmarkData).length > 0;
  const showPerformance = mode === "performance";
  const showBenchmarks = showPerformance && hasBenchmarks;

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
    if (range !== "1d" || relevantHoldings.length === 0) return [];
    const refDay = debugDate ? new Date(debugDate + "T12:00:00") : new Date();
    return getPortfolioMarketSessions(relevantHoldings, refDay);
  }, [range, relevantHoldings, debugDate]);

  // ── Full-day boundaries for 1D (earliest open → latest close) ──

  const dayBounds = useMemo(() => {
    if (range !== "1d") return null;
    if (sessionOverlays.length > 0) {
      const firstOpenMs = Math.min(...sessionOverlays.map((s) => s.openDate.getTime()));
      const lastCloseMs = Math.max(...sessionOverlays.map((s) => s.closeDate.getTime()));
      const refDay = debugDate || new Date().toISOString().slice(0, 10);
      const midnightMs = new Date(refDay + "T00:00:00").getTime();
      const startMs = Math.min(midnightMs, firstOpenMs);
      const nowMs = debugDate ? lastCloseMs : Date.now();
      const endMs = Math.max(lastCloseMs, nowMs);
      return {
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(endMs).toISOString(),
        startMs,
        endMs,
        firstOpenMs,
        lastCloseMs,
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
      firstOpenMs: startMs,
      lastCloseMs: endMs,
    };
  }, [range, sessionOverlays, debugDate]);

  // ── Derive chart data ──

  const chartData: ChartPoint[] = useMemo(() => {
    if (effectivePoints.length === 0) return [];
    const firstValue = effectivePoints[0].value;

    const realPoints: ChartPoint[] = effectivePoints.map((p, idx) => {
      const point: ChartPoint = {
        date: p.date,
        value: p.value,
        pct: firstValue > 0 ? ((p.value - firstValue) / firstValue) * 100 : 0,
        stockValue: p.stockValue,
        etfValue: p.etfValue,
        fundValue: p.fundValue,
        cryptoValue: p.cryptoValue,
      };

      if (hasBenchmarks) {
        for (const b of benchmarkEntries) {
          const arr = benchmarkData[b.key];
          if (arr && idx < arr.length) point[`bench_${b.key}`] = arr[idx];
        }
      }
      return point;
    });

    const SPIKE_THRESHOLD = 0.3;
    for (let i = 1; i < realPoints.length; i++) {
      const prev = realPoints[i - 1];
      const curr = realPoints[i];
      if (prev.value != null && curr.value != null && prev.value > 0) {
        const deltaPct = ((curr.value! - prev.value!) / prev.value!) * 100;
        if (Math.abs(deltaPct) >= SPIKE_THRESHOLD) {
          curr.spike = deltaPct;
          const totalDelta = curr.value! - prev.value!;
          const allTypes: SpikeTypeBreakdown[] = [
            { type: "Stocks", delta: (curr.stockValue ?? 0) - (prev.stockValue ?? 0), pct: 0 },
            { type: "ETFs", delta: (curr.etfValue ?? 0) - (prev.etfValue ?? 0), pct: 0 },
            { type: "Funds", delta: (curr.fundValue ?? 0) - (prev.fundValue ?? 0), pct: 0 },
            { type: "Crypto", delta: (curr.cryptoValue ?? 0) - (prev.cryptoValue ?? 0), pct: 0 },
          ];
          const filterMap: Record<string, string> = { stock: "Stocks", etf: "ETFs", fund: "Funds", crypto: "Crypto" };
          const types = (assetFilter === "all" ? allTypes : allTypes.filter((t) => t.type === filterMap[assetFilter]))
            .filter((t) => Math.abs(t.delta) > 0.01)
            .map((t) => ({ ...t, pct: totalDelta !== 0 ? (t.delta / Math.abs(totalDelta)) * 100 : 0 }))
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

          curr.spikeDetail = { delta: totalDelta, deltaPct, byType: types };
        }
      }
    }

    if (range !== "1d" || !dayBounds) return realPoints;

    const FIVE_MIN = 5 * 60 * 1000;

    const hasCrypto = assetFilter === "crypto" ||
      (assetFilter === "all" && holdings.some((h) => h.assetType === "crypto"));

    const openRanges = sessionOverlays.map((s) => ({
      start: s.openDate.getTime(),
      end: s.closeDate.getTime(),
    }));

    const shouldMask = !hasCrypto && openRanges.length > 0;
    const allClosed = !hasCrypto && allMarketsClosed;

    const isInOpenSession = (ms: number) =>
      openRanges.some((r) => ms >= r.start && ms <= r.end);

    // No session windows (e.g. weekend): do not strip values — `allClosed` alone would wipe the series.
    const applyIntradayMask = (shouldMask || allClosed) && sessionOverlays.length > 0;

    const masked = applyIntradayMask
      ? realPoints.map((p) => {
          if (allClosed || !isInOpenSession(parseTime(p.date))) {
            const kept: ChartPoint = { date: p.date };
            for (const b of benchmarkEntries) {
              const bKey = `bench_${b.key}`;
              if (p[bKey] != null) kept[bKey] = p[bKey];
            }
            if (p.spike != null) kept.spike = p.spike;
            if (p.spikeDetail) kept.spikeDetail = p.spikeDetail;
            if (p.stockValue != null) kept.stockValue = p.stockValue;
            if (p.etfValue != null) kept.etfValue = p.etfValue;
            if (p.fundValue != null) kept.fundValue = p.fundValue;
            if (p.cryptoValue != null) kept.cryptoValue = p.cryptoValue;
            return kept;
          }
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
  }, [effectivePoints, hasBenchmarks, benchmarkEntries, benchmarkData, range, dayBounds, sessionOverlays, assetFilter, holdings, allMarketsClosed]);

  const chartDataWithEvents = useMemo(
    () => events.length > 0 ? attachEventsToPoints(chartData, events) : chartData,
    [chartData, events],
  );

  const weekendBands = useMemo(() => {
    if (range === "1d") return [];
    return computeWeekendBands(chartData);
  }, [range, chartData]);

  // ── Y domain ──

  const dataKey = showPerformance ? "pct" : "value";

  const yDomain = useMemo((): [number, number] => {
    const vals: number[] = [];
    for (const p of chartData) {
      const v = showPerformance ? p.pct : p.value;
      if (v != null) vals.push(v as number);
      if (showBenchmarks) {
        for (const b of benchmarkEntries) {
          const bv = p[`bench_${b.key}`];
          if (typeof bv === "number") vals.push(bv);
        }
      }
    }
    if (vals.length === 0) return [0, 100];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08 || 1;
    return [min - pad, max + pad];
  }, [chartData, showPerformance, showBenchmarks, benchmarkEntries]);

  // ── Period return ──

  const periodReturn = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const lastWithValue = [...chartData].reverse().find((p) => p.value != null);
    const last = lastWithValue?.value;
    if (first == null || last == null || first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  // ── Spike contributors (top movers by portfolio contribution) ──

  const spikeContributors: SpikeContributor[] = useMemo(() => {
    const totalVal = relevantHoldings.reduce((s, h) => s + (h.valueInEUR || 0), 0);
    if (totalVal <= 0 || !quotes) return [];
    return relevantHoldings
      .map((h) => {
        const q = quotes[h.ticker];
        if (!q) return null;
        const weight = (h.valueInEUR || 0) / totalVal;
        const dayChangePct = q.regularMarketChangePercent ?? 0;
        const contribution = weight * dayChangePct;
        return { ticker: h.ticker, name: h.name || h.ticker, contribution, dayChangePct };
      })
      .filter((x): x is SpikeContributor => x != null && Math.abs(x.contribution) > 0.001)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);
  }, [relevantHoldings, quotes]);

  // ── Render ──

  const isIntraday = range === "1d";

  const controlButtonClass = "min-h-10 min-w-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1.5 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)] hover:text-[color:var(--foreground)]";

  const topButtons = (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
      <button
        onClick={() => setShowGuide(true)}
        className={controlButtonClass}
        title={t("chartGuide")}
        aria-label={t("chartGuide")}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
          <circle cx="12" cy="12" r="9.75" />
        </svg>
      </button>
    </div>
  );

  if (loading && points.length === 0) {
    return (
      <div id="chart" className="card relative overflow-hidden rounded-[var(--radius-card)] shadow-[0_16px_32px_rgba(1,6,16,0.28)]">
        {topButtons}
        {showGuide && <ChartGuideModal mode={mode} onClose={() => setShowGuide(false)} />}
        <div className="flex h-[340px] items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        {range === "1d" && <div className="min-h-[32px] border-t border-[color:var(--border)]" />}
        <div className="min-h-[36px] border-t border-[color:var(--border)]" />
        <div className="min-h-[32px] border-t border-[color:var(--border)]" />
      </div>
    );
  }

  const showMarketsClosedBanner = allMarketsClosed && range === "1d" &&
    assetFilter !== "crypto" &&
    !(assetFilter === "all" && holdings.some((h) => h.assetType === "crypto"));

  return (
    <div id="chart" className="card relative overflow-hidden rounded-[var(--radius-card)] shadow-[0_16px_32px_rgba(1,6,16,0.28)]">
      {topButtons}
      {showGuide && <ChartGuideModal mode={mode} onClose={() => setShowGuide(false)} />}

      {/* Chart */}
      <div className="relative h-[340px] px-3 pt-3">
        {showMarketsClosedBanner && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-highlight)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {t("marketsClosedTitle")}
              </p>
              <p className="max-w-[320px] text-xs leading-relaxed text-[color:var(--muted)]">
                {t("marketsClosedBody").replace(
                  "{value}",
                  stealthMode
                    ? "•••"
                    : (() => {
                        const last = effectivePoints.length > 0 ? effectivePoints[effectivePoints.length - 1] : null;
                        return last ? formatCurrency(last.value, baseCurrency) : "—";
                      })(),
                )}
              </p>
              {nextOpen && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-600" />
                  {t("marketsClosedOpens")
                    .replace("{market}", nextOpen.market)
                    .replace("{time}", nextOpen.time)}
                </span>
              )}
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartDataWithEvents} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="pv2-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
              <pattern id="pv2-weekend" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--weekend-hatch, rgba(148,163,184,0.08))" strokeWidth="2" />
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
                  mode={mode}
                  baseCurrency={baseCurrency}
                  stealthMode={stealthMode}
                  benchmarkEntries={showBenchmarks ? benchmarkEntries : undefined}
                  holdings={holdings}
                  range={range}
                  spikeContributors={spikeContributors}
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

            {/* Market session bands (1D) — labels shown in legend bar below chart */}
            {dayBounds && sessionOverlays.map((s, i) => {
              const x1 = findClosestDataDate(chartData, s.openDate.getTime());
              const x2 = findClosestDataDate(chartData, s.closeDate.getTime());
              if (!x1 || !x2) return null;
              return (
              <ReferenceArea
                key={`session-${i}`}
                x1={x1}
                x2={x2}
                fill={s.color}
                fillOpacity={0.05}
                ifOverflow="visible"
              />
              );
            })}

            {/* "Market closed" labels in pre-market, inter-session gaps, and after-hours (1D) */}
            {dayBounds && (() => {
              const sorted = [...sessionOverlays].sort((a, b) => a.openDate.getTime() - b.openDate.getTime());
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
              const gaps: { x1: string | null; x2: string | null; label: string }[] = [];
              if (merged.length > 0 && dayBounds.firstOpenMs > dayBounds.startMs + 5 * 60_000) {
                gaps.push({
                  x1: findClosestDataDate(chartData, dayBounds.startMs),
                  x2: findClosestDataDate(chartData, dayBounds.firstOpenMs),
                  label: "Pre-market",
                });
              }
              for (let i = 0; i < merged.length - 1; i++) {
                if (merged[i + 1].open > merged[i].close) {
                  gaps.push({
                    x1: findClosestDataDate(chartData, merged[i].close),
                    x2: findClosestDataDate(chartData, merged[i + 1].open),
                    label: "Market closed",
                  });
                }
              }
              if (merged.length > 0 && dayBounds.endMs > dayBounds.lastCloseMs + 5 * 60_000) {
                gaps.push({
                  x1: findClosestDataDate(chartData, dayBounds.lastCloseMs),
                  x2: findClosestDataDate(chartData, dayBounds.endMs),
                  label: "Market closed",
                });
              }
              return gaps.map((g, i) => {
                if (!g.x1 || !g.x2) return null;
                return (
                  <ReferenceArea
                    key={`gap-${i}`}
                    x1={g.x1}
                    x2={g.x2}
                    fill="transparent"
                    ifOverflow="visible"
                    label={({ viewBox }: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                      const vx = viewBox?.x ?? 0;
                      const vy = viewBox?.y ?? 0;
                      return (
                        <text
                          x={vx + 6}
                          y={vy + 16}
                          fill="var(--closed-label, rgba(100,116,139,0.5))"
                          fontSize={9}
                          fontWeight={500}
                          fontStyle="italic"
                        >
                          {g.label}
                        </text>
                      );
                    }}
                  />
                );
              });
            })()}

            {/* Session open/close vertical markers (1D) */}
            {sessionOverlays.map((s) => {
              const x = findClosestDataDate(chartData, s.openDate.getTime());
              if (!x) return null;
              return (
                <ReferenceLine
                  key={`open-${s.name}`}
                  x={x}
                  stroke={s.color}
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
              );
            })}
            {sessionOverlays.map((s) => {
              const x = findClosestDataDate(chartData, s.closeDate.getTime());
              if (!x) return null;
              return (
                <ReferenceLine
                  key={`close-${s.name}`}
                  x={x}
                  stroke="var(--axis, rgba(148,163,184,0.25))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.25}
                />
              );
            })}

            {/* Main area */}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#pv2-grad)"
              fillOpacity={0.8}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, index, payload } = props as {
                  cx: number;
                  cy: number;
                  index: number;
                  payload: ChartPoint;
                };
                if (typeof cx !== "number" || typeof cy !== "number") {
                  return <g key={`ed-${index}`} />;
                }
                const evts = payload?.events;
                const hasSpike = payload?.spike != null;
                const hasEvents = evts?.length;
                if (!hasSpike && !hasEvents) {
                  return <g key={`ed-${index}`} />;
                }
                const spikeColor = hasSpike ? ((payload.spike as number) > 0 ? "#10b981" : "#ef4444") : undefined;
                return (
                  <g key={`ed-${index}`}>
                    {hasSpike && (
                      <>
                        <circle cx={cx} cy={cy} r={7} fill={spikeColor} fillOpacity={0.15} />
                        <circle cx={cx} cy={cy} r={4} fill={spikeColor} fillOpacity={0.5} stroke={spikeColor} strokeWidth={1} />
                      </>
                    )}
                    {hasEvents && evts!.slice(0, 4).map((e, i) => (
                      <circle
                        key={e.id || `${e.type}-${e.ticker}-${i}`}
                        cx={cx + (i - (evts!.slice(0, 4).length - 1) / 2) * 6}
                        cy={cy}
                        r={3.5}
                        fill={eventDotFill(e.type)}
                        stroke="#fff"
                        strokeWidth={1.5}
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
                      />
                    ))}
                  </g>
                );
              }}
              activeDot={{ r: 4, strokeWidth: 2, fill: lineColor }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Benchmark lines (performance mode only) */}
            {showBenchmarks && benchmarkEntries.map((b) => (
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

      {/* Market sessions bar (1D) — always reserve space to avoid layout shift */}
      {range === "1d" && (
        <div className="flex min-h-[32px] items-center gap-4 overflow-x-auto border-t border-[color:var(--border)] px-5 py-2 text-[11px] text-[color:var(--muted)]">
          {sessionOverlays.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-[color:var(--foreground)]">{s.name}</span>
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
        onOpenAi={onOpenAi}
      />

      {/* Sync status & recalculate */}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] px-5 py-3 text-[11px] text-[color:var(--muted)]">
        {range === "1d" ? (
          <div className="flex items-center gap-1.5">
            {debugDate ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ) : showMarketsClosedBanner ? (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {debugDate
              ? `Viewing ${debugDate}`
              : loading
                ? "Syncing…"
                : showMarketsClosedBanner
                  ? `${t("marketsClosedTitle")}${nextOpen ? ` · ${nextOpen.market} ${t("marketsClosedOpens").replace("{market}", "").replace("{time}", nextOpen.time).trim()}` : ""}`
                  : "Live"}
          </div>
        ) : (
          <span>{loading ? "Loading…" : `${chartData.filter((p) => p.value != null).length} data points`}</span>
        )}
        <div className="flex items-center gap-3">
          {range === "1d" && !debugDate && !showMarketsClosedBanner && <span>Updates every 5 min</span>}
          {range === "1d" && debugDate && <span>Debug mode</span>}
          {onRecalculate && (
            <button
              onClick={onRecalculate}
              disabled={recalculating}
            className="inline-flex items-center gap-1 font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={recalculating ? "animate-spin" : ""}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
              </svg>
              {recalculating ? "Recalculating…" : "Recalculate"}
            </button>
          )}
        </div>
      </div>

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
  onOpenAi?: () => void;
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
  onOpenAi,
}: ChartFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] px-5 py-3">
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-1">
          <div className="flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1">
            <button
              onClick={() => setMode("value")}
              className={`min-h-10 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                mode === "value"
                  ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)] shadow-sm"
                  : "text-[color:var(--muted)]"
              }`}
            >
              Value
            </button>
            <button
              onClick={() => setMode("performance")}
              className={`min-h-10 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                mode === "performance"
                  ? "bg-white/12 text-[color:var(--foreground)] shadow-sm"
                  : "text-[color:var(--muted)]"
              }`}
            >
              Performance
            </button>
          </div>
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-1.5 text-[10px] font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--surface-highlight)]"
            onClick={() => setBenchmarkKeys(benchmarkKeys.filter((k) => k !== b.key))}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.color }} />
            {b.label}
            <span className="ml-0.5 text-[color:var(--muted)]">&times;</span>
          </span>
        ))}

        {/* Compare button */}
        <div className="relative">
          <button
            onClick={() => setShowCompareDropdown(!showCompareDropdown)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--muted)] transition-colors hover:border-blue-400/24 hover:text-blue-300"
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

        {/* Ask AI button */}
        {onOpenAi && (
          <button
            onClick={onOpenAi}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-blue-400/18 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300 transition-colors hover:border-blue-400/34 hover:text-blue-200"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Ask AI
          </button>
        )}
      </div>
    </div>
  );
}
