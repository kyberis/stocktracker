"use client";

import React, { useState, useEffect, useCallback } from "react";

interface SatisfactionItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  rating: number;
  comment: string;
  status: "draft" | "submitted";
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
}

interface SatisfactionStats {
  total: number;
  submitted: number;
  drafts: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

const PAGE_SIZE = 25;

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={star <= rating ? "#fbbf24" : "currentColor"}
            className={star <= rating ? "" : "text-gray-300 dark:text-slate-600"}
          />
        </svg>
      ))}
    </div>
  );
}

function StatsPanel({ stats }: { stats: SatisfactionStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="card p-3 text-center">
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.submitted}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">Submitted</div>
      </div>
      <div className="card p-3 text-center">
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.drafts}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">Drafts</div>
      </div>
      <div className="card p-3 text-center">
        <div className="text-xl font-bold text-amber-500 tabular-nums">
          {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
        </div>
        <div className="text-xs text-gray-500 dark:text-slate-400">Avg Rating</div>
      </div>
      <div className="card p-3">
        <div className="flex items-end gap-1 justify-center h-8">
          {[1, 2, 3, 4, 5].map((r) => {
            const count = stats.ratingDistribution[r] || 0;
            const max = Math.max(...Object.values(stats.ratingDistribution), 1);
            const height = Math.max((count / max) * 100, 4);
            return (
              <div key={r} className="flex flex-col items-center gap-0.5" title={`${r}★: ${count}`}>
                <div
                  className="w-4 rounded-sm bg-amber-400/80 dark:bg-amber-500/60"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-gray-400 dark:text-slate-500">{r}</span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1">Distribution</div>
      </div>
    </div>
  );
}

function TestSurveyButton() {
  const [triggered, setTriggered] = useState(false);

  const handleTrigger = () => {
    window.dispatchEvent(new Event("satisfaction-survey-trigger"));
    setTriggered(true);
    setTimeout(() => setTriggered(false), 2000);
  };

  return (
    <button
      onClick={handleTrigger}
      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-colors"
    >
      {triggered ? "Survey triggered — check bottom-right" : "Test Survey Widget"}
    </button>
  );
}

function SatisfactionTab() {
  const [items, setItems] = useState<SatisfactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SatisfactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "submitted">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/satisfaction?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total ?? 0);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusColor = (status: string) => {
    if (status === "submitted") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  };

  const planColor = (plan: string) => {
    if (plan === "pro") return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400";
    if (plan === "starter") return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    return "bg-gray-100 text-gray-600 dark:bg-slate-600/30 dark:text-slate-400";
  };

  if (loading && items.length === 0) return <p className="text-gray-500 dark:text-slate-400">Loading...</p>;

  return (
    <div>
      {stats && <StatsPanel stats={stats} />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Filter:</span>
        {(["", "submitted", "draft"] as const).map((val) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val); setPage(0); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === val
                ? "bg-indigo-600 text-white dark:bg-indigo-500"
                : "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {val === "" ? "All" : val === "submitted" ? "Submitted" : "Drafts"}
          </button>
        ))}
        </div>
        <TestSurveyButton />
      </div>

      {items.length === 0 && !loading && (
        <p className="text-gray-500 dark:text-slate-400">No surveys yet.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <StarDisplay rating={item.rating} />
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${planColor(item.plan)}`}>
                    {item.plan}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  <span className="font-medium">{item.username}</span>
                  <span className="mx-1 opacity-40">&middot;</span>
                  {item.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(item.status)}`}>
                  {item.status === "submitted" ? "Submitted" : "Draft"}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 tabular-nums">
                  {item.status === "submitted" && item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString()
                    : new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {item.comment && (
              <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap pl-0.5">
                {item.comment}
              </p>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
            Page {page + 1} of {totalPages} ({total} items)
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
  );
}

export default SatisfactionTab;
