"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, formatPercent } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { HistoricalDataPoint, TimePeriod } from "@/lib/types";

interface SeriesPoint {
  date: string;
  portfolio: number;
  sp500: number;
  nasdaq: number;
  dow: number;
  eurostoxx50: number;
  marketAverage?: number;
}

type HistoricalApiResponse = {
  data?: HistoricalDataPoint[];
};

const PERIOD_KEYS: TimePeriod[] = ["1w", "1m", "3m", "6m", "1y", "all"];
const BENCHMARK_SELECTION_KEY = "stocktracker-benchmark-selection-v1";

const PERIOD_LABELS: Record<TimePeriod, string> = {
  "1w": "period1w",
  "1m": "period1m",
  "3m": "period3m",
  "6m": "period6m",
  "1y": "period1y",
  all: "periodAll",
};

const BENCHMARKS = [
  { key: "sp500", symbol: "^GSPC", labelKey: "benchmarkSp500" },
  { key: "nasdaq", symbol: "^IXIC", labelKey: "benchmarkNasdaq" },
  { key: "dow", symbol: "^DJI", labelKey: "benchmarkDowJones" },
  { key: "eurostoxx50", symbol: "^STOXX50E", labelKey: "benchmarkEuroStoxx50" },
] as const;
type BenchmarkKey = (typeof BENCHMARKS)[number]["key"];

function normalizeSeries(values: number[]): number[] {
  if (values.length === 0) return [];
  const first = values[0];
  if (!first || first <= 0) return values.map(() => 0);
  return values.map((v) => (v / first) * 100);
}

function closeOnOrBeforeDate(series: HistoricalDataPoint[], date: string): number | null {
  if (series.length === 0) return null;
  let result: number | null = null;
  for (const point of series) {
    if (point.date <= date) {
      result = point.close;
    } else {
      break;
    }
  }
  return result;
}

export default function PortfolioBenchmarkChart() {
  const { holdings, exchangeRates } = usePortfolio();
  const { t } = useI18n();
  const [period, setPeriod] = useState<TimePeriod>("3m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SeriesPoint[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<BenchmarkKey[]>(
    () => BENCHMARKS.map((b) => b.key)
  );

  const tickers = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker))],
    [holdings]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(BENCHMARK_SELECTION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BenchmarkKey[];
      const allowed = new Set(BENCHMARKS.map((b) => b.key));
      const filtered = parsed.filter((k) => allowed.has(k));
      setSelectedBenchmarks(filtered);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(BENCHMARK_SELECTION_KEY, JSON.stringify(selectedBenchmarks));
  }, [selectedBenchmarks]);

  const fetchHistorical = useCallback(async (symbol: string, p: TimePeriod) => {
    const params = new URLSearchParams({
      symbol,
      period: p,
      provider: "yahoo",
    });
    const res = await fetch(`/api/historical?${params}`);
    if (!res.ok) return [] as HistoricalDataPoint[];
    const json = (await res.json()) as HistoricalApiResponse | HistoricalDataPoint[];
    if (Array.isArray(json)) return json;
    return json.data || [];
  }, []);

  useEffect(() => {
    const load = async () => {
      if (tickers.length === 0) {
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [holdingSeriesEntries, benchmarkEntries] = await Promise.all([
          Promise.all(
            holdings.map(async (h) => ({
              holding: h,
              series: await fetchHistorical(h.ticker, period),
            }))
          ),
          Promise.all(
            BENCHMARKS.map(async (b) => ({
              key: b.key,
              series: await fetchHistorical(b.symbol, period),
            }))
          ),
        ]);

        const sp500Series = benchmarkEntries.find((b) => b.key === "sp500")?.series || [];
        if (sp500Series.length === 0) {
          setData([]);
          setError(t("benchmarkUnavailable"));
          return;
        }

        const dates = sp500Series.map((d) => d.date);

        const portfolioRaw: number[] = dates.map((date) => {
          let sumEUR = 0;
          for (const item of holdingSeriesEntries) {
            const close = closeOnOrBeforeDate(item.series, date);
            if (close == null || close <= 0) continue;
            const value = item.holding.shares * close;
            sumEUR += convertToEUR(value, item.holding.displayCurrency, exchangeRates);
          }
          return sumEUR;
        });

        const benchmarkRaw = Object.fromEntries(
          benchmarkEntries.map((entry) => [
            entry.key,
            dates.map((date) => closeOnOrBeforeDate(entry.series, date) || 0),
          ])
        ) as Record<(typeof BENCHMARKS)[number]["key"], number[]>;

        const portfolioNorm = normalizeSeries(portfolioRaw);
        const sp500Norm = normalizeSeries(benchmarkRaw.sp500 || []);
        const nasdaqNorm = normalizeSeries(benchmarkRaw.nasdaq || []);
        const dowNorm = normalizeSeries(benchmarkRaw.dow || []);
        const euroNorm = normalizeSeries(benchmarkRaw.eurostoxx50 || []);

        const merged: SeriesPoint[] = dates.map((date, i) => ({
          date,
          portfolio: portfolioNorm[i] || 0,
          sp500: sp500Norm[i] || 0,
          nasdaq: nasdaqNorm[i] || 0,
          dow: dowNorm[i] || 0,
          eurostoxx50: euroNorm[i] || 0,
        }));

        setData(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load benchmark data");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tickers, holdings, exchangeRates, period, fetchHistorical, t]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (period === "all" || period === "1y") {
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const current = data[data.length - 1];
  const portfolioVsStart = current ? current.portfolio - 100 : 0;
  const allSelected = selectedBenchmarks.length === BENCHMARKS.length;

  const chartData = useMemo(
    () =>
      data.map((point) => {
        if (selectedBenchmarks.length === 0) {
          return { ...point, marketAverage: undefined };
        }
        const avg =
          selectedBenchmarks.reduce((sum, key) => sum + (point[key] || 0), 0) /
          selectedBenchmarks.length;
        return { ...point, marketAverage: avg };
      }),
    [data, selectedBenchmarks]
  );

  const toggleBenchmark = (key: BenchmarkKey) => {
    setSelectedBenchmarks((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-gray-700">{t("benchmarkComparison")}</p>
          {!loading && data.length > 0 && (
            <p
              className={`text-xs mt-0.5 ${
                portfolioVsStart >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {t("portfolioVsStart")}: {formatPercent(portfolioVsStart)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">{t("compareWith")}:</span>
          <button
            onClick={() => setSelectedBenchmarks(BENCHMARKS.map((b) => b.key))}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              allSelected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t("allMarkets")}
          </button>
          <button
            onClick={() => setSelectedBenchmarks([])}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              selectedBenchmarks.length === 0
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t("none")}
          </button>
          {BENCHMARKS.map((b) => {
            const selected = selectedBenchmarks.includes(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggleBenchmark(b.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  selected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t(b.labelKey as Parameters<typeof t>[0])}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {PERIOD_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                period === key
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(PERIOD_LABELS[key] as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[320px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : error ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-amber-600">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-gray-400">
          {t("benchmarkUnavailable")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name?: string) => {
                const numeric = typeof value === "number" ? value : Number(value || 0);
                return [`${numeric.toFixed(2)} (base 100)`, name || ""];
              }}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Line type="monotone" dataKey="portfolio" name={t("portfolio")} stroke="#10b981" strokeWidth={2.5} dot={false} />
            {selectedBenchmarks.includes("sp500") && (
              <Line type="monotone" dataKey="sp500" name={t("benchmarkSp500")} stroke="#3b82f6" strokeWidth={2} dot={false} />
            )}
            {selectedBenchmarks.includes("nasdaq") && (
              <Line type="monotone" dataKey="nasdaq" name={t("benchmarkNasdaq")} stroke="#8b5cf6" strokeWidth={2} dot={false} />
            )}
            {selectedBenchmarks.includes("dow") && (
              <Line type="monotone" dataKey="dow" name={t("benchmarkDowJones")} stroke="#f59e0b" strokeWidth={2} dot={false} />
            )}
            {selectedBenchmarks.includes("eurostoxx50") && (
              <Line
                type="monotone"
                dataKey="eurostoxx50"
                name={t("benchmarkEuroStoxx50")}
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            )}
            {selectedBenchmarks.length > 1 && (
              <Line
                type="monotone"
                dataKey="marketAverage"
                name={t("marketAverage")}
                stroke="#6b7280"
                strokeDasharray="4 3"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
