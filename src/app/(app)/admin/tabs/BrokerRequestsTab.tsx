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

type BrokerStatus = BrokerRequestRow["status"];

interface BrokerRequestGroupRow {
  normalizedName: string;
  displayName: string;
  variants: string[];
  count: number;
  statusCounts: Record<BrokerStatus, number>;
  earliestRequestedAt: string;
  latestRequestedAt: string;
}

const PAGE_SIZE = 25;
const STATUSES = ["requested", "reviewing", "planned", "done", "rejected"] as const;

export default function BrokerRequestsTab() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const [entries, setEntries] = useState<BrokerRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");

  const [groups, setGroups] = useState<BrokerRequestGroupRow[]>([]);
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupPage, setGroupPage] = useState(0);
  const [groupLoading, setGroupLoading] = useState(true);

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

  const loadGroups = useCallback(async () => {
    setGroupLoading(true);
    try {
      const res = await fetch(
        `/api/admin/broker-integration-requests?view=grouped&page=${groupPage}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setGroups(data.entries || []);
        setGroupTotal(data.total || 0);
      }
    } catch {
      // ignore network errors in admin table
    } finally {
      setGroupLoading(false);
    }
  }, [groupPage]);

  // Load both on mount (grouped is default; flat is fetched too so the
  // toggle and the "Total Requests" stat are ready without a loading flash).
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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
          // Status is per-row, not per-group (see listBrokerIntegrationRequestGroupsForAdmin) —
          // refresh the grouped status breakdown so it stays accurate.
          loadGroups();
        }
      } catch {
        // ignore update failures in table interaction
      } finally {
        setSavingId("");
      }
    },
    [loadGroups]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusLabels: Record<BrokerRequestRow["status"], string> = {
    requested: t("adminBrokerRequestStatusRequested"),
    reviewing: t("adminBrokerRequestStatusReviewing"),
    planned: t("adminBrokerRequestStatusPlanned"),
    done: t("adminBrokerRequestStatusDone"),
    rejected: t("adminBrokerRequestStatusRejected"),
  };

  const groupTotalPages = Math.max(1, Math.ceil(groupTotal / PAGE_SIZE));

  if (viewMode === "grouped" && groupLoading && groups.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">Loading requests...</p>;
  }
  if (viewMode === "flat" && loading && entries.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">Loading requests...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={total} />
        <StatCard label="Distinct Brokers" value={groupTotal} />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode("grouped")}
          className={`text-xs px-3 py-1.5 rounded-md font-medium ${
            viewMode === "grouped"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
          }`}
        >
          By broker (demand)
        </button>
        <button
          type="button"
          onClick={() => setViewMode("flat")}
          className={`text-xs px-3 py-1.5 rounded-md font-medium ${
            viewMode === "flat"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
          }`}
        >
          Individual requests
        </button>
      </div>

      {viewMode === "grouped" ? (
        groups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
            No broker integration requests yet.
          </p>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr className="text-gray-500 dark:text-slate-400">
                    <th className="text-left p-3 font-medium">Broker</th>
                    <th className="text-left p-3 font-medium">Requests</th>
                    <th className="text-left p-3 font-medium">Status breakdown</th>
                    <th className="text-left p-3 font-medium">First requested</th>
                    <th className="text-left p-3 font-medium">Last requested</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.normalizedName}
                      className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200"
                    >
                      <td className="p-3 font-medium">
                        {group.displayName}
                        {group.variants.length > 1 && (
                          <div className="text-xs font-normal text-gray-400 dark:text-slate-500">
                            also submitted as: {group.variants.filter((v) => v !== group.displayName).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{group.count}</td>
                      <td className="p-3 text-xs text-gray-600 dark:text-slate-300">
                        {STATUSES.filter((s) => group.statusCounts[s] > 0)
                          .map((s) => `${statusLabels[s]}: ${group.statusCounts[s]}`)
                          .join(" · ")}
                      </td>
                      <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                        {new Date(group.earliestRequestedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                        {new Date(group.latestRequestedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {groupTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                <button
                  disabled={groupPage === 0}
                  onClick={() => setGroupPage((p) => Math.max(0, p - 1))}
                  className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Page {groupPage + 1} of {groupTotalPages}
                </span>
                <button
                  disabled={groupPage >= groupTotalPages - 1}
                  onClick={() => setGroupPage((p) => p + 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )
      ) : entries.length === 0 ? (
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
