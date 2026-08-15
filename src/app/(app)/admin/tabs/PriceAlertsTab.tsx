"use client";

import React, { useCallback, useEffect, useState } from "react";

interface AlertDispatchSummary {
  activeAlerts: number;
  logs24h: number;
  fired24h: number;
  failed24h: number;
  skipped24h: number;
  byChannelSent24h: Record<string, number>;
  byStatus7d: Record<string, number>;
}

interface AlertDispatchLogRow {
  id: string;
  userId: string;
  alertId: string;
  ticker: string;
  alertType: string;
  status: string;
  channelsRequested: string;
  channelsSent: string;
  channelsFailed: string;
  channelsSkipped: string;
  details: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  "",
  "fired",
  "dispatch_failed",
  "skipped_config",
  "quote_invalid",
  "fx_unavailable",
];

const CHANNEL_OPTIONS = ["", "email", "telegram", "push", "device"];

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-red-600 dark:text-red-400"
          : "text-gray-900 dark:text-white";
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "fired"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status === "dispatch_failed"
        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function PriceAlertsTab() {
  const [summary, setSummary] = useState<AlertDispatchSummary | null>(null);
  const [logs, setLogs] = useState<AlertDispatchLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (filterUser.trim()) params.set("userId", filterUser.trim());
      if (filterStatus) params.set("status", filterStatus);
      if (filterChannel) params.set("channel", filterChannel);
      const res = await fetch(`/api/admin/alert-dispatch?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || null);
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterUser, filterStatus, filterChannel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const channelSent = summary?.byChannelSent24h || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Price alerts</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
            Cron fires every 15 minutes. Delivery uses the user&apos;s selected channels only
            (email and/or Telegram; push/device when enabled). WhatsApp is not supported.
          </p>
        </div>
        <button type="button" onClick={fetchData} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active alerts" value={summary.activeAlerts} />
          <StatCard label="Events 24h" value={summary.logs24h} />
          <StatCard label="Fired 24h" value={summary.fired24h} tone="ok" />
          <StatCard label="Failed 24h" value={summary.failed24h} tone={summary.failed24h > 0 ? "bad" : undefined} />
          <StatCard label="Skipped 24h" value={summary.skipped24h} tone={summary.skipped24h > 0 ? "warn" : undefined} />
          <StatCard
            label="Email / Telegram 24h"
            value={`${channelSent.email || 0} / ${channelSent.telegram || 0}`}
          />
        </div>
      )}

      {summary && Object.keys(summary.byStatus7d).length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Status (7 days)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byStatus7d).map(([status, count]) => (
              <span
                key={status}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600"
              >
                {status}: <strong>{count}</strong>
              </span>
            ))}
          </div>
          {Object.keys(channelSent).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(channelSent).map(([ch, count]) => (
                <span
                  key={ch}
                  className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  sent {ch}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">User ID</label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => {
              setFilterUser(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by user ID…"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Channel</label>
          <select
            value={filterChannel}
            onChange={(e) => {
              setFilterChannel(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
          >
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c || "all"} value={c}>
                {c || "All channels"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500 dark:text-slate-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 dark:text-slate-400">
            No dispatch events yet. They appear after check-alerts evaluates thresholds.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-left text-xs text-gray-500 dark:text-slate-400">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Ticker</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Sent</th>
                  <th className="px-3 py-2 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-slate-300">
                        {row.createdAt.replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.ticker}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{row.alertType}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300">
                        {row.channelsRequested || "—"}
                      </td>
                      <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400">
                        {row.channelsSent || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                        {row.userId.slice(0, 8)}…
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr className="bg-gray-50 dark:bg-slate-900/40">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="grid gap-2 text-xs text-gray-700 dark:text-slate-300">
                            <p>
                              <span className="font-medium">Alert ID:</span> {row.alertId}
                            </p>
                            <p>
                              <span className="font-medium">Failed:</span> {row.channelsFailed || "—"}
                            </p>
                            <p>
                              <span className="font-medium">Skipped:</span>{" "}
                              <code className="break-all">{row.channelsSkipped || "[]"}</code>
                            </p>
                            <pre className="overflow-x-auto rounded-lg bg-white dark:bg-slate-950 p-2 border border-gray-200 dark:border-slate-700 text-[11px]">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(row.details || "{}"), null, 2);
                                } catch {
                                  return row.details;
                                }
                              })()}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Page {page + 1} / {totalPages} ({total} events)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
