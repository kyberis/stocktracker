"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatEur } from "../../shared";

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
}

interface PortfolioInfo {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  holdingCount: number;
  totalValueEur: number;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MiniChart({ userId, portfolio }: { userId: string; portfolio: PortfolioInfo }) {
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/history?portfolioId=${encodeURIComponent(portfolio.id)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPoints(Array.isArray(data.points) ? data.points : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId, portfolio.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const latest = points.length > 0 ? points[points.length - 1].value : portfolio.totalValueEur;
  const first = points.length > 0 ? points[0].value : latest;
  const change = first > 0 ? ((latest - first) / first) * 100 : 0;
  const isPositive = change >= 0;

  const accentColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = `adminGrad-${portfolio.id}`;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{portfolio.name}</h4>
          <span className="text-[10px] text-gray-400 dark:text-slate-500">{portfolio.currency}</span>
          {portfolio.isDefault && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">Default</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{formatEur(latest)}</span>
          {points.length > 1 && (
            <span className={`ml-2 text-[11px] font-semibold tabular-nums ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-28 flex items-center justify-center">
          <span className="text-[11px] text-gray-400 dark:text-slate-500 animate-pulse">Loading chart…</span>
        </div>
      ) : points.length < 2 ? (
        <div className="h-28 flex items-center justify-center">
          <span className="text-[11px] text-gray-400 dark:text-slate-500">No snapshot history</span>
        </div>
      ) : (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={formatDateLabel}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
                  return `€${Math.round(v)}`;
                }}
                width={60}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e2e8f0",
                }}
                labelFormatter={(d) => {
                  const s = String(d);
                  const dt = new Date(s.includes("T") ? s : s.replace(" ", "T"));
                  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                }}
                formatter={(value) => [`€${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Value"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-slate-500">
        <span>{portfolio.holdingCount} holdings</span>
        <span>{points.length} snapshots</span>
      </div>
    </div>
  );
}

export default function AdminPortfolioCharts({ userId, portfolios }: { userId: string; portfolios: PortfolioInfo[] }) {
  if (portfolios.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        Portfolio History ({portfolios.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {portfolios.map((p) => (
          <MiniChart key={p.id} userId={userId} portfolio={p} />
        ))}
      </div>
    </div>
  );
}
