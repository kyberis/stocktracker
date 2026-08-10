"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSettings } from "@/lib/settings-context";
import { useTheme } from "@/lib/theme-context";
import type { HistoricalDataPoint, TimePeriod } from "@/lib/types";
import { useScreeningCopy } from "./use-screening-copy";

type ChartPeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "5y";

const PERIODS: ChartPeriod[] = ["1w", "1m", "3m", "6m", "1y", "5y"];

function apiPeriod(period: ChartPeriod): TimePeriod {
  return period === "5y" ? "all" : period;
}

function sliceForPeriod(
  points: HistoricalDataPoint[],
  period: ChartPeriod,
): HistoricalDataPoint[] {
  if (period !== "5y" || points.length === 0) return points;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);
  const cut = cutoff.toISOString().slice(0, 10);
  const sliced = points.filter((p) => p.date >= cut);
  return sliced.length > 1 ? sliced : points;
}

function formatPrice(value: number, currency: string, locale: string): string {
  const formatted = value.toLocaleString(locale || "en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 100 ? 0 : 2,
  });
  const c = (currency || "").toUpperCase();
  if (!c || c === "USD") return formatted;
  if (c === "EUR") return `${formatted} €`;
  if (c === "GBP" || c === "GBX") return `${formatted} £`;
  return `${formatted} ${c}`;
}

function ChartTooltip({
  active,
  payload,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ payload: HistoricalDataPoint }>;
  currency: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1.5 shadow-lg">
      <p className="text-[10px] text-[color:var(--muted)]">{point.date}</p>
      <p className="text-[12px] font-semibold tabular-nums text-[color:var(--foreground)]">
        {formatPrice(point.close, currency, locale)}
      </p>
    </div>
  );
}

/**
 * Compact price history for screening candidate cards.
 * Fetches `/api/historical` when scrolled into view (avoids ≤5 parallel loads).
 */
export function ScreeningPriceChart({
  ticker,
  currency,
  locked = false,
  embedded = false,
}: {
  ticker: string;
  currency: string;
  locked?: boolean;
  /** Nested inside Technicals — no outer card chrome. */
  embedded?: boolean;
}) {
  const { copy, language } = useScreeningCopy();
  const { getApiHeaders } = useSettings();
  const { isDark } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [period, setPeriod] = useState<ChartPeriod>("1y");
  const [rawData, setRawData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || locked) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [locked]);

  const fetchData = useCallback(async () => {
    if (!visible || locked) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        symbol: ticker,
        period: apiPeriod(period),
      });
      const res = await fetch(`/api/historical?${params}`, {
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        setRawData([]);
        setError(true);
        return;
      }
      const json = (await res.json()) as {
        data?: HistoricalDataPoint[];
      };
      setRawData(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRawData([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [visible, locked, ticker, period, getApiHeaders]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const data = useMemo(
    () => sliceForPeriod(rawData, period),
    [rawData, period],
  );

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const up = last >= first;
  const chartColor = up ? "#10b981" : "#ef4444";
  const changePct =
    first > 0 && data.length > 1 ? ((last - first) / first) * 100 : null;

  const tickFill = isDark ? "#94a3b8" : "#9ca3af";
  const axisStroke = isDark ? "#334155" : "#e5e7eb";
  const gradientId = `screening-price-${ticker.replace(/[^a-zA-Z0-9]/g, "")}`;

  const formatDate = useCallback(
    (date: string) => {
      const d = new Date(date);
      if (period === "5y" || period === "1y") {
        return d.toLocaleDateString(language || "en", {
          month: "short",
          year: "2-digit",
        });
      }
      return d.toLocaleDateString(language || "en", {
        month: "short",
        day: "numeric",
      });
    },
    [period, language],
  );

  const periodLabel = (key: ChartPeriod): string => {
    switch (key) {
      case "1w":
        return copy.report.priceChart1w;
      case "1m":
        return copy.report.priceChart1m;
      case "3m":
        return copy.report.priceChart3m;
      case "6m":
        return copy.report.priceChart6m;
      case "1y":
        return copy.report.priceChart1y;
      case "5y":
        return copy.report.priceChart5y;
    }
  };

  const changeTone =
    changePct == null
      ? "text-[color:var(--muted)]"
      : changePct > 0
        ? "text-emerald-700 dark:text-emerald-300"
        : changePct < 0
          ? "text-rose-700 dark:text-rose-300"
          : "text-[color:var(--muted)]";

  const shellClass = embedded
    ? "mt-3"
    : "mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3";
  const titleClass = embedded
    ? "text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]"
    : "text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300";

  if (locked) {
    return (
      <div className={shellClass}>
        <p className={titleClass}>{copy.report.priceChartTitle}</p>
        <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
          {copy.report.lockedCell.repeat(10)}
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={shellClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={titleClass}>{copy.report.priceChartTitle}</p>
        {changePct != null && !loading && data.length > 1 ? (
          <p className={`text-[12px] font-semibold tabular-nums ${changeTone}`}>
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </p>
        ) : null}
      </div>

      <div
        className="mt-2 flex flex-wrap gap-1"
        role="group"
        aria-label={copy.report.priceChartTitle}
      >
        {PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            aria-pressed={period === key}
            className={`min-h-8 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              period === key
                ? "bg-emerald-500 text-white"
                : "bg-[color:var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            {periodLabel(key)}
          </button>
        ))}
      </div>

      {loading || !visible ? (
        <div
          className="mt-3 flex items-center justify-center"
          style={{ height: 160 }}
          aria-busy="true"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : error || data.length === 0 ? (
        <p
          className="mt-3 flex items-center justify-center text-[12px] text-[color:var(--muted)]"
          style={{ height: 160 }}
        >
          {copy.report.priceChartNoData}
        </p>
      ) : (
        <div
          className="mt-3"
          role="img"
          aria-label={`${copy.report.priceChartTitle} ${ticker} ${periodLabel(period)}`}
          style={{ height: 160 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: axisStroke }}
                tickLine={false}
                minTickGap={36}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) =>
                  v >= 100 ? v.toFixed(0) : v.toFixed(1)
                }
              />
              <Tooltip
                content={
                  <ChartTooltip currency={currency} locale={language} />
                }
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
