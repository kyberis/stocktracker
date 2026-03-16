"use client";

import React, { useCallback, useEffect, useState } from "react";

/* ── SnapTrade Logs Tab ───────────────────────────────────── */

interface SnapTradeLogRow {
  id: string;
  userId: string;
  action: string;
  status: string;
  requestSummary: string;
  responseBody: string;
  errorMessage: string;
  durationMs: number;
  createdAt: string;
}

const SNAPTRADE_ACTIONS = [
  "registerUser",
  "deleteUser",
  "listBrokerages",
  "generateConnectionPortalUrl",
  "listBrokerageConnections",
  "removeBrokerageConnection",
  "refreshBrokerageConnection",
  "listAccounts",
  "fetchAllHoldings",
  "fetchAllHoldings:raw",
  "fetchActivities",
  "fetchActivities:raw",
];

function SnapTradeLogsTab() {
  const [logs, setLogs] = useState<SnapTradeLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (filterUser.trim()) params.set("userId", filterUser.trim());
      if (filterAction) params.set("action", filterAction);
      const res = await fetch(`/api/admin/snaptrade-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterUser, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  function formatJson(raw: string): string {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">User ID</label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
            placeholder="Filter by user ID..."
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Action</label>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All actions</option>
            {SNAPTRADE_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={() => fetchLogs()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Refresh
        </button>
        <span className="text-xs text-gray-500 dark:text-slate-400 self-center ml-auto">
          {total} log{total !== 1 ? "s" : ""} total
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No SnapTrade API logs found.</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-3 py-2 text-left font-medium">Request</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className={`border-t border-gray-100 dark:border-slate-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${
                        expandedId === log.id ? "bg-gray-50 dark:bg-slate-800/30" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        {new Date(log.createdAt + "Z").toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-200 font-mono max-w-[120px] truncate" title={log.userId}>
                        {log.userId.length > 12 ? log.userId.slice(0, 12) + "..." : log.userId}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === "success"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {log.durationMs}ms
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400 font-mono max-w-[200px] truncate" title={log.requestSummary}>
                        {log.requestSummary.length > 60 ? log.requestSummary.slice(0, 60) + "..." : log.requestSummary}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="border-t border-gray-100 dark:border-slate-700/50">
                        <td colSpan={6} className="px-3 py-3 bg-gray-50 dark:bg-slate-800/50">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Request Summary</p>
                              <pre className="text-[11px] leading-relaxed text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                {formatJson(log.requestSummary)}
                              </pre>
                            </div>
                            {log.errorMessage && (
                              <div>
                                <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">Error</p>
                                <pre className="text-[11px] leading-relaxed text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                  {log.errorMessage}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Response Body</p>
                              <pre className="text-[11px] leading-relaxed text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded p-2 overflow-x-auto max-h-96 whitespace-pre-wrap break-all">
                                {formatJson(log.responseBody)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-slate-700">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SnapTradeLogsTab;
