"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "../shared";

interface McpFunnelStats {
  profileViews: number;
  tokensCreated: number;
  usersWithTokens: number;
  clientsConnected: number;
  activeUsers: number;
  totalToolCalls: number;
}

interface McpUserRow {
  userId: string;
  username: string;
  email: string;
  plan: string;
  tokensCreated: number;
  firstTokenAt: string | null;
  clientConnectedAt: string | null;
  toolCallsPeriod: number;
  toolCallsAllTime: number;
  activeDaysPeriod: number;
  lastToolCallAt: string | null;
  authTypes: string;
}

interface McpAnalyticsData {
  periodDays: number;
  funnel: McpFunnelStats;
  dailyToolCalls: { date: string; calls: number; users: number }[];
  toolBreakdown: { tool: string; count: number }[];
  recurrence: { bucket: string; users: number }[];
  users: McpUserRow[];
}

const PERIODS = [7, 30, 90] as const;

function FunnelBar({ label, count, max, hint }: { label: string; count: number; max: number; hint?: string }) {
  const widthPct = max > 0 ? Math.max((count / max) * 100, 6) : 6;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${widthPct}%` }} />
      </div>
      {hint ? <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}

export default function McpAnalyticsTab() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<McpAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/mcp-analytics?days=${days}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json() as Promise<McpAnalyticsData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load MCP analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const funnel = data?.funnel;
  const funnelMax = funnel
    ? Math.max(
        funnel.profileViews,
        funnel.usersWithTokens,
        funnel.clientsConnected,
        funnel.activeUsers,
        1,
      )
    : 1;

  const avgCallsPerActive =
    funnel && funnel.activeUsers > 0
      ? (funnel.totalToolCalls / funnel.activeUsers).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">MCP Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Adoption funnel, tool calls, and user recurrence for trefolio MCP.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[color:var(--border)] p-1 bg-[color:var(--surface)]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                days === p
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : null}

      {funnel ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Profile MCP views" value={funnel.profileViews} />
            <StatCard label="Tokens created" value={funnel.tokensCreated} />
            <StatCard label="Clients connected" value={funnel.clientsConnected} />
            <StatCard label="Tool calls" value={funnel.totalToolCalls} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Adoption funnel</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 -mt-2">
                Unique users at each stage in the last {days} days
              </p>
              <FunnelBar
                label="Viewed Profile → Developer · MCP"
                count={funnel.profileViews}
                max={funnelMax}
                hint="Opened the MCP tab in trefolio profile"
              />
              <FunnelBar
                label="Generated token"
                count={funnel.usersWithTokens}
                max={funnelMax}
                hint={`${funnel.tokensCreated} token(s) created total`}
              />
              <FunnelBar
                label="Connected MCP client"
                count={funnel.clientsConnected}
                max={funnelMax}
                hint="Successful MCP initialize (Cursor, Claude, etc.)"
              />
              <FunnelBar
                label="Made tool calls"
                count={funnel.activeUsers}
                max={funnelMax}
                hint={`Avg ${avgCallsPerActive} calls per active user`}
              />
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Usage recurrence</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                Active days with tool calls per user in period
              </p>
              {data?.recurrence.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.recurrence} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-700" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">No tool calls in this period yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Daily tool calls</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Calls and unique users per day</p>
              {data?.dailyToolCalls.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.dailyToolCalls} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} dot={false} name="Calls" />
                    <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} dot={false} name="Users" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">No daily data yet.</p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Tools called</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Breakdown by tool name</p>
              {data?.toolBreakdown.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data.toolBreakdown}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 80, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-700" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="tool" tick={{ fontSize: 10 }} width={76} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">No tool breakdown yet.</p>
              )}
            </div>
          </div>

          <div className="card p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Users</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              Users with tokens, a connected client, or tool calls (up to 200, sorted by last use)
            </p>
            {data?.users.length ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-[color:var(--border)]">
                    <th className="py-2 pr-3 font-semibold">User</th>
                    <th className="py-2 pr-3 font-semibold">Plan</th>
                    <th className="py-2 pr-3 font-semibold">Tokens</th>
                    <th className="py-2 pr-3 font-semibold">Connected</th>
                    <th className="py-2 pr-3 font-semibold">Calls ({days}d)</th>
                    <th className="py-2 pr-3 font-semibold">Active days</th>
                    <th className="py-2 pr-3 font-semibold">All-time calls</th>
                    <th className="py-2 pr-3 font-semibold">Last call</th>
                    <th className="py-2 font-semibold">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.userId} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-gray-900 dark:text-white">{u.username}</div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-500 truncate max-w-[180px]">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 capitalize">{u.plan}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.tokensCreated}</td>
                      <td className="py-2.5 pr-3 text-[11px] text-gray-600 dark:text-slate-400">
                        {u.clientConnectedAt ? u.clientConnectedAt.slice(0, 10) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums font-semibold">{u.toolCallsPeriod}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.activeDaysPeriod || "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.toolCallsAllTime}</td>
                      <td className="py-2.5 pr-3 text-[11px] text-gray-600 dark:text-slate-400">
                        {u.lastToolCallAt ? u.lastToolCallAt.slice(0, 16).replace("T", " ") : "—"}
                      </td>
                      <td className="py-2.5 text-[11px] text-gray-500 dark:text-slate-400">{u.authTypes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400">No MCP users recorded yet.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
