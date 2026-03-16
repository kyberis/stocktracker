"use client";

import React, { useCallback, useEffect, useState } from "react";
import { StatCard } from "../shared";

/* ── Device Waitlist Tab ──────────────────────────────────── */

interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
}

const PAGE_SIZE = 25;

function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/device-interest?page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setEntries(d.entries || []);
        setTotal(d.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && entries.length === 0) return <p className="text-gray-500 dark:text-slate-400">Loading waitlist...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Signups" value={total} />
      </div>

      {entries.length === 0 && !loading ? (
        <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-8">
          No one has signed up for device notifications yet.
        </p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr className="text-gray-500 dark:text-slate-400">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} className="border-t border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-200">
                    <td className="p-3 text-gray-400 dark:text-slate-500 text-xs">{page * PAGE_SIZE + i + 1}</td>
                    <td className="p-3 font-mono text-sm">{entry.email}</td>
                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
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

export default WaitlistTab;
