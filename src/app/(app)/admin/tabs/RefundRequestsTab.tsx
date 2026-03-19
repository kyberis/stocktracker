"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "../shared";

interface RefundRequestRow {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  resolvedAt: string;
  createdAt: string;
  userEmail: string;
  userDisplayName: string;
  username: string;
  userLanguage: string;
  userPlan: string;
}

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<RefundRequestRow["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<RefundRequestRow["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export default function RefundRequestsTab() {
  const [entries, setEntries] = useState<RefundRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState("");
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/refund-requests?page=${page}&pageSize=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      setResolvingId(id);
      try {
        const res = await fetch(`/api/admin/refund-requests/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminNote: noteInputs[id] || "" }),
        });
        if (res.ok) {
          const updated = await res.json();
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === id ? { ...entry, status: updated.status, adminNote: updated.adminNote, resolvedAt: updated.resolvedAt } : entry,
            ),
          );
        }
      } catch {
        // ignore
      } finally {
        setResolvingId("");
      }
    },
    [noteInputs],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingCount = entries.filter((e) => e.status === "pending").length;

  if (loading && entries.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">Loading refund requests...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={total} />
        <StatCard label="Pending" value={pendingCount} />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
          No refund requests yet.
        </p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Language</th>
                  <th className="text-left p-3 font-medium">Reason</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                  <th className="text-left p-3 font-medium">Requested At</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200 align-top">
                    <td className="p-3 font-medium">{row.userDisplayName || row.username}</td>
                    <td className="p-3">
                      <a
                        href={`mailto:${row.userEmail}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {row.userEmail}
                      </a>
                    </td>
                    <td className="p-3 capitalize text-xs">{row.userPlan}</td>
                    <td className="p-3 uppercase text-xs">{row.userLanguage || "en"}</td>
                    <td className="p-3 max-w-[340px] text-xs text-gray-600 dark:text-slate-300 whitespace-pre-wrap">
                      {row.reason || "—"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[row.status]}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.status === "pending" ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            value={noteInputs[row.id] || ""}
                            onChange={(e) => setNoteInputs((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder="Admin note (optional)"
                            rows={2}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => resolve(row.id, "approved")}
                              disabled={resolvingId === row.id}
                              className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => resolve(row.id, "rejected")}
                              disabled={resolvingId === row.id}
                              className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {row.adminNote && (
                            <p className="mb-1 italic">&quot;{row.adminNote}&quot;</p>
                          )}
                          {row.resolvedAt && (
                            <p>
                              {new Date(row.resolvedAt).toLocaleDateString()}{" "}
                              {new Date(row.resolvedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                      {new Date(row.createdAt).toLocaleDateString()}{" "}
                      {new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40"
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
