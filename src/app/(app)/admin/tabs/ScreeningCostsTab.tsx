"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/** Keep in sync with SCREENING_COST_BUDGET_USD in `@/lib/screening/cost` (client-safe). */
const SCREENING_COST_BUDGET_USD = 1.2;

interface ScreeningCostRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  status: string;
  intent: string;
  mockedPipeline: boolean;
  costUsd: number;
  breakdown: {
    currency: "USD";
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
  createdAt: string;
  updatedAt: string;
}

interface ScreeningCircuit {
  paused: boolean;
  provider: string;
  statusCode?: number;
  detail: string;
  trippedAt: string;
  trippedBy: "system" | "admin";
  clearedAt?: string;
  clearedByUserId?: string;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function ScreeningCostsTab() {
  const [runs, setRuns] = useState<ScreeningCostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [circuit, setCircuit] = useState<ScreeningCircuit | null>(null);
  const [circuitBusy, setCircuitBusy] = useState(false);
  const [circuitError, setCircuitError] = useState<string | null>(null);
  const pageSize = 30;

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (filterUser.trim()) params.set("userId", filterUser.trim());
      const res = await fetch(`/api/admin/screening-costs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        setTotal(data.total || 0);
        setTotalCostUsd(Number(data.totalCostUsd) || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterUser]);

  const fetchCircuit = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/screening-provider-circuit");
      if (!res.ok) return;
      const data = (await res.json()) as { circuit?: ScreeningCircuit };
      if (data.circuit) setCircuit(data.circuit);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    void fetchCircuit();
  }, [fetchCircuit]);

  async function setCircuitAction(action: "pause" | "resume") {
    setCircuitBusy(true);
    setCircuitError(null);
    try {
      const res = await fetch("/api/admin/screening-provider-circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "pause"
            ? { action, provider: "unknown", detail: "Paused manually from admin" }
            : { action },
        ),
      });
      if (!res.ok) {
        setCircuitError("Could not update screening circuit");
        return;
      }
      const data = (await res.json()) as { circuit?: ScreeningCircuit };
      if (data.circuit) setCircuit(data.circuit);
    } catch {
      setCircuitError("Could not update screening circuit");
    } finally {
      setCircuitBusy(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const pageTotalCost = runs.reduce((s, r) => s + r.costUsd, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Screening report costs
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Variable ops cost per report (LLM + Tavily). Ranked most expensive
          first. Soft budget ${SCREENING_COST_BUDGET_USD.toFixed(2)}. FMP is
          excluded (fixed plan).
        </p>
      </div>

      <section
        id="screening-provider-circuit"
        className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Provider circuit
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
              Pauses new screens when FMP, Tavily, Serper, Jina, or OpenAI hit
              quota. Existing reports stay readable.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              circuit?.paused
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            }`}
            role="status"
          >
            {circuit?.paused ? "Paused" : "Active"}
          </span>
        </div>
        {circuit?.paused || circuit?.trippedAt ? (
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-700 dark:text-slate-300 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-500 dark:text-slate-400">Provider</dt>
              <dd className="mt-0.5">{circuit.provider || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-slate-400">HTTP status</dt>
              <dd className="mt-0.5">{circuit.statusCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-slate-400">Tripped</dt>
              <dd className="mt-0.5">
                {circuit.trippedAt
                  ? `${circuit.trippedAt} (${circuit.trippedBy})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-slate-400">Detail</dt>
              <dd className="mt-0.5 break-all">{circuit.detail || "—"}</dd>
            </div>
          </dl>
        ) : null}
        {circuitError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {circuitError}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {circuit?.paused ? (
            <button
              type="button"
              onClick={() => void setCircuitAction("resume")}
              disabled={circuitBusy}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              Resume screening
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void setCircuitAction("pause")}
              disabled={circuitBusy}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
            >
              Pause manually
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label
            htmlFor="screening-cost-user-filter"
            className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
          >
            User ID
          </label>
          <input
            id="screening-cost-user-filter"
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
          onClick={() => fetchRuns()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
        <div className="flex flex-wrap gap-4 ml-auto self-center">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {total} report{total !== 1 ? "s" : ""}
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            All: {formatCost(totalCostUsd)}
            {runs.length > 0 && (
              <>
                {" "}
                &middot; Page: {formatCost(pageTotalCost)}
              </>
            )}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400" role="status">
          Loading...
        </p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No screening runs found.
        </p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Screening reports ranked by variable cost, highest first
              </caption>
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Cost
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    User
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Intent
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Created
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Run
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run, idx) => {
                  const rank = page * pageSize + idx + 1;
                  const overBudget = run.costUsd > SCREENING_COST_BUDGET_USD;
                  return (
                    <React.Fragment key={run.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(expandedId === run.id ? null : run.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedId(expandedId === run.id ? null : run.id);
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
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-400 tabular-nums">
                          {rank}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium ${
                            overBudget
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatCost(run.costUsd)}
                          {overBudget && (
                            <span className="ml-1 text-[10px] font-semibold uppercase">
                              over
                            </span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2 text-gray-700 dark:text-slate-200 font-mono max-w-[140px] truncate"
                          title={`${run.username || run.userId}\n${run.email}`}
                        >
                          {run.username || run.userId.slice(0, 12) + "..."}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {run.intent}
                          </span>
                          {run.mockedPipeline && (
                            <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                              mock
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              run.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : run.status === "running"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                          {new Date(run.createdAt + "Z").toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                            colSpan={7}
                            className="px-3 py-3 bg-gray-50 dark:bg-slate-800/50"
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div className="text-gray-500 dark:text-slate-400">
                                <strong>User:</strong> {run.username || "—"} (
                                {run.email || run.userId})
                              </div>
                              <div>
                                <strong className="text-gray-500 dark:text-slate-400">
                                  Total:
                                </strong>{" "}
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCost(run.costUsd)}
                                </span>
                              </div>
                              <div className="text-gray-500 dark:text-slate-400">
                                <strong>LLM:</strong>{" "}
                                {formatCost(run.breakdown.llmUsd)} (
                                {run.breakdown.llmTokensIn.toLocaleString()} in /{" "}
                                {run.breakdown.llmTokensOut.toLocaleString()} out)
                              </div>
                              <div className="text-gray-500 dark:text-slate-400">
                                <strong>Tavily:</strong> search{" "}
                                {formatCost(run.breakdown.tavilySearchUsd)} (
                                {run.breakdown.tavilySearchCredits} cr) · extract{" "}
                                {formatCost(run.breakdown.tavilyExtractUsd)} (
                                {run.breakdown.tavilyExtractCredits} cr) ·
                                research {formatCost(run.breakdown.tavilyResearchUsd)}{" "}
                                ({run.breakdown.tavilyResearchCredits} cr)
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
    </div>
  );
}

export default ScreeningCostsTab;
