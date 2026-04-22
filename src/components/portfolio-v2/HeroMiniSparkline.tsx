"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { formatPercent } from "@/lib/utils";

interface Point {
  date: string;
  value: number;
}

interface Props {
  /** Invoked when the user clicks the sparkline to open the deep-dive chart. */
  onOpen?: () => void;
  /**
   * Preview range. 1W is safe for all plans; 1M gives a richer curve but requires
   * Pro. Falls back to 1W automatically if the API rejects 1M.
   */
  range?: "1w" | "1m";
  /** Optional a11y label shown to screen readers over the button. */
  ariaLabel?: string;
  /** Bumped to re-trigger fetch when the underlying portfolio data changes. */
  refreshKey?: unknown;
}

const WIDTH = 600;
const HEIGHT = 52;
const PADDING_Y = 6;

function buildPath(values: number[]): { line: string; area: string } {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = WIDTH / (values.length - 1);

  const coords = values.map((v, i) => {
    const x = i * stepX;
    const y = HEIGHT - PADDING_Y - ((v - min) / range) * (HEIGHT - PADDING_Y * 2);
    return [x, y] as const;
  });

  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area =
    `${line} L${WIDTH.toFixed(2)},${HEIGHT} L0,${HEIGHT} Z`;
  return { line, area };
}

export default function HeroMiniSparkline({ onOpen, range = "1w", ariaLabel, refreshKey }: Props) {
  const { t } = useI18n();
  const { activePortfolioId, mutationVersion } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchVersion = useRef(0);

  useEffect(() => {
    if (activePortfolioId == null) {
      setValues([]);
      setLoading(false);
      return;
    }
    const version = ++fetchVersion.current;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ range, portfolioId: String(activePortfolioId) });
    fetch(`/api/portfolio/history?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { points: [] as Point[] }))
      .then((data) => {
        if (cancelled || version !== fetchVersion.current) return;
        const pts: Point[] = Array.isArray(data.points) ? data.points : [];
        const vals = pts
          .map((p) => (typeof p.value === "number" ? p.value : 0))
          .filter((v) => v > 0);
        setValues(vals);
      })
      .catch(() => {
        if (!cancelled) setValues([]);
      })
      .finally(() => {
        if (!cancelled && version === fetchVersion.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId, range, mutationVersion, refreshKey]);

  const { line, area, pct, isPos } = useMemo(() => {
    const { line, area } = buildPath(values);
    if (values.length < 2) return { line, area, pct: 0, isPos: true };
    const first = values[0];
    const last = values[values.length - 1];
    const p = first > 0 ? ((last - first) / first) * 100 : 0;
    return { line, area, pct: p, isPos: p >= 0 };
  }, [values]);

  const stroke = isPos ? "rgb(16 185 129)" : "rgb(239 68 68)"; // emerald-500 / red-500
  const fillId = `spark-fill-${isPos ? "up" : "down"}`;

  const rangeLabel = range === "1m" ? t("sparkline1MLabel") : t("sparkline1WLabel");

  const content = (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        {area && <path d={area} fill={`url(#${fillId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="relative z-[1] flex items-center justify-between px-5 h-full pointer-events-none">
        <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
          {rangeLabel}
        </span>
        {values.length >= 2 && !stealthMode && (
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}
          >
            {isPos && pct !== 0 ? "+" : ""}
            {formatPercent(pct)}
          </span>
        )}
      </div>
    </>
  );

  // If there is not enough data to draw a meaningful line, render nothing so the
  // collapsed card stays tidy rather than showing a flat placeholder.
  if (!loading && values.length < 2) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel ?? rangeLabel}
      className="relative block w-full overflow-hidden border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
      style={{ height: HEIGHT }}
    >
      {loading && values.length < 2 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent animate-pulse" />
        </div>
      ) : (
        content
      )}
    </button>
  );
}
