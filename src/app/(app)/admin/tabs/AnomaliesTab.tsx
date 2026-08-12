"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AnomalyItem = {
  id: string;
  userId: string;
  status: string;
  severity: string;
  codes: string[];
  findings: Array<{
    id: string;
    severity: string;
    code: string;
    ticker?: string;
    message: string;
    autoFixable: boolean;
    fixAction: string;
  }>;
  aiExplanation: string;
  remediationPrompt: string;
  fingerprint: string;
  notifiedAt: string;
  createdAt: string;
  updatedAt: string;
  username?: string;
  email?: string;
  displayName?: string;
};

const PAGE_SIZE = 25;

export default function AnomaliesTab() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id") || "";

  const [items, setItems] = useState<AnomalyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("open");
  const [severity, setSeverity] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnomalyItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        status,
        severity,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/admin/anomalies?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, severity, page]);

  const loadOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/anomalies?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.anomaly) {
      setSelected({
        ...data.anomaly,
        username: data.user?.username || "",
        email: data.user?.email || "",
        displayName: data.user?.displayName || "",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusId) void loadOne(focusId);
  }, [focusId, loadOne]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function runAction(
    action: "ack" | "dismiss" | "apply_safe_fix" | "rescan" | "rebuild_holdings",
    anomaly: AnomalyItem,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const body =
        action === "rescan"
          ? { action, userId: anomaly.userId }
          : { action, anomalyId: anomaly.id };
      const res = await fetch("/api/admin/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMessage(
        action === "apply_safe_fix"
          ? `Safe fix applied (${data.repair?.fixedCount ?? 0} fixes). Remaining: ${data.remainingFindings ?? 0}.`
          : action === "rescan"
            ? "Rescan complete."
            : `Marked ${action}.`,
      );
      await load();
      if (data.anomaly) setSelected(data.anomaly);
      else if (action === "rescan") await loadOne(anomaly.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Portfolio anomalies
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Staff triage for calculation / holdings data issues. AI explanations are staff-only and may be inaccurate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-gray-500 dark:text-slate-400" htmlFor="anomaly-status-filter">
            Status
            <select
              id="anomaly-status-filter"
              className="ml-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
              value={status}
              onChange={(e) => {
                setPage(0);
                setStatus(e.target.value);
              }}
            >
              <option value="open">open</option>
              <option value="acked">acked</option>
              <option value="fixed">fixed</option>
              <option value="dismissed">dismissed</option>
              <option value="all">all</option>
            </select>
          </label>
          <label className="text-xs text-gray-500 dark:text-slate-400" htmlFor="anomaly-severity-filter">
            Severity
            <select
              id="anomaly-severity-filter"
              className="ml-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
              value={severity}
              onChange={(e) => {
                setPage(0);
                setSeverity(e.target.value);
              }}
            >
              <option value="all">all</option>
              <option value="error">error</option>
              <option value="warn">warn</option>
              <option value="info">info</option>
            </select>
          </label>
        </div>
      </div>

      {message && (
        <div role="status" className="text-sm rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 px-3 py-2">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No anomalies for this filter.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 ${
                      selected?.id === item.id ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {item.displayName || item.username || item.email || item.userId}
                      </span>
                      <span
                        className={`text-[11px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                          item.severity === "error"
                            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.codes.join(", ")} · {item.status}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500">
            <span>
              {total} total · page {page + 1}/{pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3 min-h-[320px]">
          {!selected ? (
            <p className="text-sm text-gray-500">Select an anomaly to review.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    {selected.displayName || selected.username || selected.userId}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {selected.email} · {selected.status} · {selected.severity}
                  </p>
                </div>
                <Link
                  href={`/admin/users/${selected.userId}`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open user
                </Link>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  AI explanation
                </h3>
                <p className="text-sm text-gray-800 dark:text-slate-200 mt-1 whitespace-pre-wrap">
                  {selected.aiExplanation || "—"}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Remediation prompt
                </h3>
                <p className="text-sm text-gray-800 dark:text-slate-200 mt-1 whitespace-pre-wrap">
                  {selected.remediationPrompt || "—"}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Findings
                </h3>
                <ul className="space-y-1.5 max-h-48 overflow-auto">
                  {selected.findings.map((f) => (
                    <li
                      key={f.id}
                      className="text-xs rounded border border-gray-100 dark:border-slate-800 px-2 py-1.5"
                    >
                      <span className="font-semibold">{f.code}</span>
                      {f.ticker ? ` · ${f.ticker}` : ""} · {f.severity}
                      {f.autoFixable ? " · auto-fixable" : ""}
                      <div className="text-gray-600 dark:text-slate-400 mt-0.5">{f.message}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("ack", selected)}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  Ack
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("apply_safe_fix", selected)}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  Apply safe fix
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("rebuild_holdings", selected)}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  Rebuild holdings
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("rescan", selected)}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  Rescan
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("dismiss", selected)}
                  className="btn-danger text-sm px-3 py-1.5"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
