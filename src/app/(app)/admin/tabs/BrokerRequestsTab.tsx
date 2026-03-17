"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { StatCard } from "../shared";

interface BrokerRequestRow {
  id: string;
  brokerName: string;
  note: string;
  status: "requested" | "reviewing" | "planned" | "done" | "rejected";
  createdAt: string;
  userEmail: string;
  userDisplayName: string;
  username: string;
  userLanguage: string;
}

const PAGE_SIZE = 25;
const STATUSES = ["requested", "reviewing", "planned", "done", "rejected"] as const;

export default function BrokerRequestsTab() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<BrokerRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/broker-integration-requests?page=${page}&pageSize=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore network errors in admin table
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (id: string, status: BrokerRequestRow["status"]) => {
      setSavingId(id);
      try {
        const res = await fetch(`/api/admin/broker-integration-requests/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === id ? { ...entry, status } : entry
            )
          );
        }
      } catch {
        // ignore update failures in table interaction
      } finally {
        setSavingId("");
      }
    },
    []
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusLabels: Record<BrokerRequestRow["status"], string> = {
    requested: t("adminBrokerRequestStatusRequested"),
    reviewing: t("adminBrokerRequestStatusReviewing"),
    planned: t("adminBrokerRequestStatusPlanned"),
    done: t("adminBrokerRequestStatusDone"),
    rejected: t("adminBrokerRequestStatusRejected"),
  };

  if (loading && entries.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">Loading requests...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={total} />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
          No broker integration requests yet.
        </p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left p-3 font-medium">Requested Broker</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Language</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Note</th>
                  <th className="text-left p-3 font-medium">Requested At</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200">
                    <td className="p-3 font-medium">{row.brokerName}</td>
                    <td className="p-3">{row.userDisplayName || row.username}</td>
                    <td className="p-3">
                      <a
                        href={`mailto:${row.userEmail}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {row.userEmail}
                      </a>
                    </td>
                    <td className="p-3 uppercase text-xs">{row.userLanguage || "en"}</td>
                    <td className="p-3">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          updateStatus(
                            row.id,
                            e.target.value as BrokerRequestRow["status"]
                          )
                        }
                        disabled={savingId === row.id}
                        className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 max-w-[340px] text-xs text-gray-600 dark:text-slate-300">
                      {row.note || "—"}
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
