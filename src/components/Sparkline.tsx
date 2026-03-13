"use client";

import { useEffect, useState, memo } from "react";

interface SparklineProps {
  ticker: string;
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

const cache = new Map<string, number[]>();
const inflight = new Map<string, Promise<number[]>>();

function fetchSparkData(ticker: string): Promise<number[]> {
  const existing = inflight.get(ticker);
  if (existing) return existing;

  const promise = fetch(`/api/historical?symbol=${encodeURIComponent(ticker)}&period=1w`)
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((json) => {
      const points: number[] = (json.data || []).map((p: { close: number }) => p.close).filter((v: number) => v > 0);
      cache.set(ticker, points);
      inflight.delete(ticker);
      return points;
    })
    .catch(() => {
      inflight.delete(ticker);
      return [];
    });

  inflight.set(ticker, promise);
  return promise;
}

function buildPath(points: number[], w: number, h: number): string {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 1;

  return points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = pad + ((max - v) / range) * (h - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Sparkline({ ticker, width = 80, height = 24, positive, className = "" }: SparklineProps) {
  const [points, setPoints] = useState<number[]>(() => cache.get(ticker) || []);

  useEffect(() => {
    if (cache.has(ticker)) {
      setPoints(cache.get(ticker)!);
      return;
    }
    let cancelled = false;
    fetchSparkData(ticker).then((data) => {
      if (!cancelled) setPoints(data);
    });
    return () => { cancelled = true; };
  }, [ticker]);

  if (points.length < 2) {
    return <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />;
  }

  const isUp = positive ?? points[points.length - 1] >= points[0];
  const color = isUp ? "var(--gain, #22c55e)" : "var(--loss, #ef4444)";
  const d = buildPath(points, width, height);

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default memo(Sparkline);
