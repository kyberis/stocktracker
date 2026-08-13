"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface AnalyzeUserRow {
  userId: string;
  username: string;
  email: string;
  analyzeCount: number;
  lastRequestedAt: string;
}

interface AnalyzeRunRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  status: string;
  ticker: string | null;
  companyName: string | null;
  exchange: string | null;
  mockedPipeline: boolean;
  costUsd: number;
  breakdown: {
    llmUsd: number;
    tavilySearchUsd: number;
    tavilyExtractUsd: number;
    tavilyResearchUsd: number;
    tavilySearchCredits: number;
    tavilyExtractCredits: number;
    tavilyResearchCredits: number;
    llmTokensIn: number;
    llmTokensOut: number;
  };
  irProvider: string | null;
  serperQueries: number;
  jinaUrls: number;
  irSiteDocsUsed: boolean;
  createdAt: string;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const stamp = iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`;
  return new Date(stamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScreeningAnalyzeTab() {
  const [users, setUsers] = useState<AnalyzeUserRow[]>([]);
  const [runs, setRuns] = useState<AnalyzeRunRow[]>([]);
  const [total, setTotal] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 30;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (filterUser.trim()) params.set("userId", filterUser.trim());
      const res = await fetch(`/api/admin/screening-analyze?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setRuns(data.runs || []);
        setTotal(data.total || 0);
        setUniqueUsers(data.uniqueUsers || 0);
        setTotalCostUsd(Number(data.totalCostUsd) || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterUser]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Screening Analyze
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Who requested a single-company Analyze, and which IR/search resources
          each run used (LLM, Tavily, Serper, Jina). Newest first.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label
            htmlFor="screening-analyze-user-filter"
            className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
          >
            User ID
          </label>
          <input
            id="screening-analyze-user-filter"
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
        <button
          type="button"
          onClick={() => fetchRows()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
        <div className="flex flex-wrap gap-4 ml-auto self-center">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {total} Analyze run{total !== 1 ? "s" : ""} · {uniqueUsers} user
            {uniqueUsers !== 1 ? "s" : ""}
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Cost: {formatCost(totalCostUsd)}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400" role="status">
          Loading...
        </p>
      ) : (
        <>
          <section aria-labelledby="analyze-users-heading">
            <h3
              id="analyze-users-heading"
              className="text-sm font-semibold text-gray-900 dark:text-white mb-2"
            >
              Users who requested Analyze
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
              Click a row to filter runs to that user.
            </p>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No Analyze runs yet.
              </p>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <caption className="sr-only">
                      Users who launched Analyze, with run counts
                    </caption>
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr className="text-gray-500 dark:text-slate-400">
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          User
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          Email
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Runs
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          Last request
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.userId}
                          className="border-t border-gray-100 dark:border-slate-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30"
                          onClick={() => {
                            setFilterUser(u.userId);
                            setPage(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setFilterUser(u.userId);
                              setPage(0);
                            }
                          }}
                          tabIndex={0}
                        >
                          <td className="px-3 py-2 text-gray-800 dark:text-slate-100">
                            {u.username || u.userId.slice(0, 8) + "…"}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-slate-300">
                            {u.email || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {u.analyzeCount}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                            {formatWhen(u.lastRequestedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="analyze-runs-heading">
            <h3
              id="analyze-runs-heading"
              className="text-sm font-semibold text-gray-900 dark:text-white mb-2"
            >
              Analyze runs and resources
            </h3>
            {runs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No Analyze runs found.
              </p>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <caption className="sr-only">
                      Analyze runs with IR provider and search/extract usage
                    </caption>
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr className="text-gray-500 dark:text-slate-400">
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          When
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          User
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          Company
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          IR
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Serper
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Jina
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Tavily
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Cost
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">
                          Run
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => {
                        const tavilyCredits =
                          run.breakdown.tavilySearchCredits +
                          run.breakdown.tavilyExtractCredits +
                          run.breakdown.tavilyResearchCredits;
                        return (
                          <React.Fragment key={run.id}>
                            <tr
                              onClick={() =>
                                setExpandedId(
                                  expandedId === run.id ? null : run.id,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setExpandedId(
                                    expandedId === run.id ? null : run.id,
                                  );
                                }
                              }}
                              tabIndex={0}
                              aria-expanded={expandedId === run.id}
                              className={`border-t border-gray-100 dark:border-slate-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${
                                expandedId === run.id
                                  ? "bg-gray-50 dark:bg-slate-800/30"
                                  : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                                {formatWhen(run.createdAt)}
                              </td>
                              <td
                                className="px-3 py-2 text-gray-700 dark:text-slate-200 font-mono max-w-[140px] truncate"
                                title={`${run.username || run.userId}\n${run.email}`}
                              >
                                {run.username || run.userId.slice(0, 12) + "…"}
                              </td>
                              <td className="px-3 py-2 text-gray-800 dark:text-slate-100">
                                <span className="font-semibold">
                                  {run.ticker || "—"}
                                </span>
                                {run.companyName && (
                                  <span className="block text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[180px]">
                                    {run.companyName}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  {run.irProvider || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {run.serperQueries}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {run.jinaUrls}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {tavilyCredits} cr
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCost(run.costUsd)}
                              </td>
                              <td className="px-3 py-2">
                                <Link
                                  href={`/screening/runs/${encodeURIComponent(run.id)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                                >
                                  {run.id.slice(0, 8)}…
                                </Link>
                              </td>
                            </tr>
                            {expandedId === run.id && (
                              <tr className="border-t border-gray-100 dark:border-slate-700/50">
                                <td
                                  colSpan={9}
                                  className="px-3 py-3 bg-gray-50 dark:bg-slate-800/50"
                                >
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 dark:text-slate-300">
                                    <div>
                                      <strong>User:</strong> {run.username || "—"}{" "}
                                      ({run.email || run.userId})
                                    </div>
                                    <div>
                                      <strong>Status:</strong> {run.status}
                                      {run.mockedPipeline ? " · mock" : ""}
                                    </div>
                                    <div>
                                      <strong>IR docs:</strong>{" "}
                                      {run.irSiteDocsUsed ? "yes" : "no"}
                                    </div>
                                    <div>
                                      <strong>LLM:</strong>{" "}
                                      {formatCost(run.breakdown.llmUsd)} (
                                      {run.breakdown.llmTokensIn.toLocaleString()}{" "}
                                      in /{" "}
                                      {run.breakdown.llmTokensOut.toLocaleString()}{" "}
                                      out)
                                    </div>
                                    <div>
                                      <strong>Tavily:</strong> search{" "}
                                      {run.breakdown.tavilySearchCredits} cr ·
                                      extract{" "}
                                      {run.breakdown.tavilyExtractCredits} cr ·
                                      research{" "}
                                      {run.breakdown.tavilyResearchCredits} cr
                                    </div>
                                    <div>
                                      <strong>Serper / Jina:</strong>{" "}
                                      {run.serperQueries} queries / {run.jinaUrls}{" "}
                                      URLs
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-slate-700">
                    <button
                      type="button"
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
                      type="button"
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
          </section>
        </>
      )}
    </div>
  );
}

export default ScreeningAnalyzeTab;
