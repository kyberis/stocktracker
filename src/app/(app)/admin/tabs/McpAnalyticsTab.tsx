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
  topTools: string;
  topScopes: string;
}

interface McpAnalyticsData {
  periodDays: number;
  funnel: McpFunnelStats;
  dailyToolCalls: { date: string; calls: number; users: number }[];
  toolBreakdown: { tool: string; count: number; users: number }[];
  scopeBreakdown: { scope: string; calls: number; users: number }[];
  resourceBreakdown: { key: string; value: string; calls: number; users: number }[];
  recentAccess: {
    createdAt: string;
    userId: string;
    username: string;
    email: string;
    toolName: string;
    scope: string | null;
    resources: string | null;
    authType: string | null;
  }[];
  recurrence: { bucket: string; users: number }[];
  users: McpUserRow[];
}

const PERIODS = [7, 30, 90] as const;

function FunnelBar({ label, count, max, hint }: { label: string; count: number; max: number; hint?: string }) {
  const widthPct = max > 0 ? Math.max((count / max) * 100, 6) : 6;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-[color:var(--foreground)]">{label}</span>
        <span className="text-sm font-bold text-[color:var(--foreground)] tabular-nums">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-[color:var(--border)]/40 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${widthPct}%` }} />
      </div>
      {hint ? <p className="text-[11px] text-[color:var(--muted)] mt-1">{hint}</p> : null}
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

  const scopeChartData =
    data?.scopeBreakdown.map((s) => ({
      scope: s.scope,
      calls: s.calls,
      users: s.users,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[color:var(--foreground)]">MCP Analytics</h2>
          <p className="text-sm text-[color:var(--muted)]">
            Adoption, users, tool calls, and which data domains / resources agents access.
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
                  : "text-[color:var(--muted)] hover:bg-[color:var(--border)]/30"
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
        <p className="text-sm text-[color:var(--muted)]">Loading…</p>
      ) : null}

      {funnel ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Profile MCP views" value={funnel.profileViews} />
            <StatCard label="Tokens created" value={funnel.tokensCreated} />
            <StatCard label="Active users" value={funnel.activeUsers} />
            <StatCard label="Tool calls" value={funnel.totalToolCalls} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Adoption funnel</h3>
              <p className="text-xs text-[color:var(--muted)] -mt-2">
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
              <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Usage recurrence</h3>
              <p className="text-xs text-[color:var(--muted)] mb-4">
                Active days with tool calls per user in period
              </p>
              {data?.recurrence.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.recurrence} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[color:var(--border)]" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">No tool calls in this period yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Daily tool calls</h3>
              <p className="text-xs text-[color:var(--muted)] mb-4">Calls and unique users per day</p>
              {data?.dailyToolCalls.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.dailyToolCalls} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[color:var(--border)]" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} dot={false} name="Calls" />
                    <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} dot={false} name="Users" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">No daily data yet.</p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Data domains (scopes)</h3>
              <p className="text-xs text-[color:var(--muted)] mb-4">
                Which PAT scopes / data categories agents hit
              </p>
              {scopeChartData.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={scopeChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 90, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[color:var(--border)]" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="scope" tick={{ fontSize: 10 }} width={86} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">
                  No scope data yet. New tool calls record scope automatically.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Tools called</h3>
              <p className="text-xs text-[color:var(--muted)] mb-4">Breakdown by tool name (with unique users)</p>
              {data?.toolBreakdown.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.toolBreakdown}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 90, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[color:var(--border)]" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="tool" tick={{ fontSize: 10 }} width={86} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "count" ? "Calls" : "Users"]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">No tool breakdown yet.</p>
              )}
            </div>

            <div className="card p-4 overflow-x-auto">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Data accessed</h3>
              <p className="text-xs text-[color:var(--muted)] mb-4">
                Top tickers, FMP paths, portfolios, and years requested via tool args (privacy-safe allowlist)
              </p>
              {data?.resourceBreakdown.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[color:var(--muted)] border-b border-[color:var(--border)]">
                      <th className="py-2 pr-3 font-semibold">Key</th>
                      <th className="py-2 pr-3 font-semibold">Value</th>
                      <th className="py-2 pr-3 font-semibold">Calls</th>
                      <th className="py-2 font-semibold">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.resourceBreakdown.map((r) => (
                      <tr
                        key={`${r.key}:${r.value}`}
                        className="border-b border-[color:var(--border)] last:border-0"
                      >
                        <td className="py-2 pr-3 font-mono text-[11px]">{r.key}</td>
                        <td className="py-2 pr-3 font-medium text-[color:var(--foreground)] break-all max-w-[220px]">
                          {r.value}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{r.calls}</td>
                        <td className="py-2 tabular-nums">{r.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">
                  No resource args recorded yet (tools without identifiers still count in tools/scopes).
                </p>
              )}
            </div>
          </div>

          <div className="card p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Recent access</h3>
            <p className="text-xs text-[color:var(--muted)] mb-4">
              Last 50 tool calls in the period — who called what, and which resources
            </p>
            {data?.recentAccess.length ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[color:var(--muted)] border-b border-[color:var(--border)]">
                    <th className="py-2 pr-3 font-semibold">When</th>
                    <th className="py-2 pr-3 font-semibold">User</th>
                    <th className="py-2 pr-3 font-semibold">Tool</th>
                    <th className="py-2 pr-3 font-semibold">Scope</th>
                    <th className="py-2 pr-3 font-semibold">Resources</th>
                    <th className="py-2 font-semibold">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAccess.map((row, idx) => (
                    <tr
                      key={`${row.createdAt}-${row.userId}-${row.toolName}-${idx}`}
                      className="border-b border-[color:var(--border)] last:border-0"
                    >
                      <td className="py-2 pr-3 text-[11px] text-[color:var(--muted)] whitespace-nowrap">
                        {row.createdAt.slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium text-[color:var(--foreground)]">{row.username}</div>
                        <div className="text-[11px] text-[color:var(--muted)] truncate max-w-[140px]">
                          {row.email}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px]">{row.toolName}</td>
                      <td className="py-2 pr-3 font-mono text-[11px]">{row.scope ?? "—"}</td>
                      <td className="py-2 pr-3 text-[11px] break-all max-w-[260px]">
                        {row.resources ?? "—"}
                      </td>
                      <td className="py-2 text-[11px] text-[color:var(--muted)]">{row.authType ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[color:var(--muted)]">No recent tool calls.</p>
            )}
          </div>

          <div className="card p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-[color:var(--foreground)] mb-1">Users</h3>
            <p className="text-xs text-[color:var(--muted)] mb-4">
              Users with tokens, a connected client, or tool calls (up to 200) — includes top tools and scopes
            </p>
            {data?.users.length ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[color:var(--muted)] border-b border-[color:var(--border)]">
                    <th className="py-2 pr-3 font-semibold">User</th>
                    <th className="py-2 pr-3 font-semibold">Plan</th>
                    <th className="py-2 pr-3 font-semibold">Calls ({days}d)</th>
                    <th className="py-2 pr-3 font-semibold">Active days</th>
                    <th className="py-2 pr-3 font-semibold">Top tools</th>
                    <th className="py-2 pr-3 font-semibold">Top scopes</th>
                    <th className="py-2 pr-3 font-semibold">Last call</th>
                    <th className="py-2 font-semibold">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.userId} className="border-b border-[color:var(--border)] last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-[color:var(--foreground)]">{u.username}</div>
                        <div className="text-[11px] text-[color:var(--muted)] truncate max-w-[180px]">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 capitalize">{u.plan}</td>
                      <td className="py-2.5 pr-3 tabular-nums font-semibold">{u.toolCallsPeriod}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.activeDaysPeriod || "—"}</td>
                      <td className="py-2.5 pr-3 text-[11px] max-w-[200px]">{u.topTools || "—"}</td>
                      <td className="py-2.5 pr-3 text-[11px] font-mono max-w-[180px]">{u.topScopes || "—"}</td>
                      <td className="py-2.5 pr-3 text-[11px] text-[color:var(--muted)]">
                        {u.lastToolCallAt ? u.lastToolCallAt.slice(0, 16).replace("T", " ") : "—"}
                      </td>
                      <td className="py-2.5 text-[11px] text-[color:var(--muted)]">{u.authTypes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[color:var(--muted)]">No MCP users recorded yet.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
