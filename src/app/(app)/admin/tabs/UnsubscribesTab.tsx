"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TabSkeleton, StatCard, relativeTime } from "../shared";

interface UnsubscribeEvent {
  token: string;
  userId: string;
  usedAt: string;
  createdAt: string;
  username: string;
  email: string;
  displayName: string;
  plan: string;
  emailNotificationsEnabled: boolean;
}

const PAGE_SIZE = 25;

const PLAN_STYLES: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500",
  starter: "bg-blue-500/10 text-blue-400",
  pro: "bg-emerald-500/10 text-emerald-400",
};

export default function UnsubscribesTab() {
  const [events, setEvents] = useState<UnsubscribeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/unsubscribes?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <TabSkeleton />;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Email Unsubscribes
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Unsubscribes" value={total} />
        <StatCard
          label="Currently Unsubscribed"
          value={events.filter((e) => !e.emailNotificationsEnabled).length}
        />
        <StatCard
          label="Re-subscribed"
          value={events.filter((e) => e.emailNotificationsEnabled).length}
        />
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No unsubscribe events yet.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <th className="text-left p-3 font-medium text-[10px] uppercase">
                  User
                </th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">
                  Email
                </th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">
                  Plan
                </th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">
                  Unsubscribed
                </th>
                <th className="text-left p-3 font-medium text-[10px] uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr
                  key={e.token}
                  className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/users/${e.userId}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400"
                    >
                      {e.displayName || e.username || "—"}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                    {e.email || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${PLAN_STYLES[e.plan] || PLAN_STYLES.free}`}
                    >
                      {e.plan}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-slate-400">
                    <span title={e.usedAt}>
                      {relativeTime(e.usedAt)}
                    </span>
                  </td>
                  <td className="p-3">
                    {e.emailNotificationsEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Re-subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Unsubscribed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Prev
            </button>
            <span className="px-2 text-xs text-gray-500 dark:text-slate-400">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
