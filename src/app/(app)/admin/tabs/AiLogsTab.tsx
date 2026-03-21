"use client";

import React, { useCallback, useEffect, useState } from "react";

interface AiLogRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  source: string;
  model: string;
  promptSystem: string;
  promptUser: string;
  response: string;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  durationMs: number;
  status: string;
  errorMessage: string;
  createdAt: string;
}

const AI_SOURCES = [
  "fundamental",
  "intelligence",
  "economic",
  "crypto",
  "tax_assistant",
  "portfolio_ai",
  "chart_chat",
  "portfolio_review",
  "portfolio_score",
  "support_chat",
  "import",
  "device_ai_summary",
];

const SOURCE_LABELS: Record<string, string> = {
  fundamental: "Fundamentals",
  intelligence: "Intelligence",
  economic: "Economic",
  crypto: "Crypto",
  tax_assistant: "Tax Assistant",
  portfolio_ai: "Portfolio AI",
  chart_chat: "Chart Chat",
  portfolio_review: "Portfolio Review",
  portfolio_score: "Portfolio Score",
  support_chat: "Support Chat",
  import: "Import",
  device_ai_summary: "Device Summary",
};

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function AiLogsTab() {
  const [logs, setLogs] = useState<AiLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (filterUser.trim()) params.set("userId", filterUser.trim());
      if (filterSource) params.set("source", filterSource);
      const res = await fetch(`/api/admin/ai-logs?${params}`);
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
  }, [page, filterUser, filterSource]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const pageTotalCost = logs.reduce((s, l) => s + l.costUsd, 0);
  const pageTotalTokens = logs.reduce((s, l) => s + l.tokensUsed, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => {
              setFilterUser(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by user ID..."
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            Source
          </label>
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All sources</option>
            {AI_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
        <div className="flex gap-4 ml-auto self-center">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {total} log{total !== 1 ? "s" : ""}
          </span>
          {logs.length > 0 && (
            <>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Page: {formatCost(pageTotalCost)} &middot; {pageTotalTokens.toLocaleString()} tokens
              </span>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No AI logs found.
        </p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">In / Out</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-3 py-2 text-left font-medium">Prompt</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                      className={`border-t border-gray-100 dark:border-slate-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${
                        expandedId === log.id
                          ? "bg-gray-50 dark:bg-slate-800/30"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        {new Date(log.createdAt + "Z").toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td
                        className="px-3 py-2 text-gray-700 dark:text-slate-200 font-mono max-w-[140px] truncate"
                        title={`${log.username || log.userId}\n${log.email}`}
                      >
                        {log.username || log.userId.slice(0, 12) + "..."}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {SOURCE_LABELS[log.source] || log.source}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === "success"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        <span className="text-blue-600 dark:text-blue-400">{log.tokensInput.toLocaleString()}</span>
                        {" / "}
                        <span className="text-orange-600 dark:text-orange-400">{log.tokensOutput.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCost(log.costUsd)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {log.durationMs}ms
                      </td>
                      <td
                        className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[180px] truncate"
                        title={log.promptUser}
                      >
                        {log.promptUser.length > 60
                          ? log.promptUser.slice(0, 60) + "..."
                          : log.promptUser}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="border-t border-gray-100 dark:border-slate-700/50">
                        <td
                          colSpan={8}
                          className="px-3 py-3 bg-gray-50 dark:bg-slate-800/50"
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div className="text-gray-500 dark:text-slate-400">
                                <strong>User:</strong> {log.username} ({log.email})
                              </div>
                              <div className="text-gray-500 dark:text-slate-400">
                                <strong>Model:</strong> {log.model}
                              </div>
                              <div>
                                <strong className="text-gray-500 dark:text-slate-400">Tokens:</strong>{" "}
                                <span className="text-blue-600 dark:text-blue-400">{log.tokensInput.toLocaleString()} in</span>
                                {" + "}
                                <span className="text-orange-600 dark:text-orange-400">{log.tokensOutput.toLocaleString()} out</span>
                                {" = "}
                                <span className="font-medium text-gray-700 dark:text-slate-200">{log.tokensUsed.toLocaleString()}</span>
                              </div>
                              <div>
                                <strong className="text-gray-500 dark:text-slate-400">Cost:</strong>{" "}
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCost(log.costUsd)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                System Prompt
                              </p>
                              <pre className="text-[11px] leading-relaxed text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                {log.promptSystem}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                User Prompt
                              </p>
                              <pre className="text-[11px] leading-relaxed text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                {log.promptUser}
                              </pre>
                            </div>
                            {log.errorMessage && (
                              <div>
                                <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">
                                  Error
                                </p>
                                <pre className="text-[11px] leading-relaxed text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                  {log.errorMessage}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                Response
                              </p>
                              <pre className="text-[11px] leading-relaxed text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded p-2 overflow-x-auto max-h-96 whitespace-pre-wrap break-all">
                                {log.response || "(empty / streaming pending)"}
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

export default AiLogsTab;
