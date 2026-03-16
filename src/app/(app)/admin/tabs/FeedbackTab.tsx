"use client";

import React, { useState, useEffect, useCallback } from "react";

/* ── Feedback Tab ─────────────────────────────────────────── */

interface FeedbackItem {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  type: "feedback" | "bug";
  status: "open" | "answered" | "closed";
  adminReply: string;
  createdAt: string;
  repliedAt: string;
  userContext: string;
}

function FeedbackContextPanel({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  if (!raw) return null;
  let ctx: Record<string, string> = {};
  try { ctx = JSON.parse(raw); } catch { return null; }

  const rows = [
    ["Page", ctx.page],
    ["Email", ctx.email],
    ["Plan", ctx.plan],
    ["Browser", ctx.userAgent],
    ["Viewport", ctx.viewport],
    ["Locale", ctx.locale],
    ["User ID", ctx.userId],
  ].filter(([, v]) => v) as [string, string][];

  if (rows.length === 0) return null;

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span>User Context</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2 text-xs">
              <span className="shrink-0 font-medium text-gray-500 dark:text-slate-500 w-16">{label}</span>
              <span className="text-gray-700 dark:text-slate-300 break-all">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 25;

function FeedbackTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback?page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const feedbackItems = data.items || data;
        setItems(feedbackItems);
        setTotal(data.total ?? feedbackItems.length);
        const rMap: Record<string, string> = {};
        const sMap: Record<string, string> = {};
        for (const item of feedbackItems) {
          rMap[item.id] = item.adminReply || "";
          sMap[item.id] = item.status;
        }
        setReplyMap(rMap);
        setStatusMap(sMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const handleReply = async (id: string) => {
    setSendingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          reply: replyMap[id] || "",
          status: statusMap[id] || "answered",
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, adminReply: replyMap[id] || "", status: (statusMap[id] || "answered") as FeedbackItem["status"], repliedAt: new Date().toISOString() }
              : item
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setSendingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && items.length === 0) return <p className="text-gray-500 dark:text-slate-400">Loading...</p>;
  if (items.length === 0 && !loading) return <p className="text-gray-500 dark:text-slate-400">No feedback yet.</p>;

  const statusColor = (status: string) => {
    if (status === "answered") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    if (status === "closed") return "bg-gray-100 text-gray-600 dark:bg-slate-600/30 dark:text-slate-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  };

  const typeColor = (type: string) => {
    if (type === "bug") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColor(item.type)}`}>
                  {item.type === "bug" ? "Bug" : "Feedback"}
                </span>
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.subject}
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                From <span className="font-medium">{item.username}</span> &middot;{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}
            >
              {item.status}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
            {item.message}
          </p>

          {item.type === "bug" && item.userContext && (
            <FeedbackContextPanel raw={item.userContext} />
          )}

          {/* Reply form */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 space-y-2">
            <textarea
              value={replyMap[item.id] ?? ""}
              onChange={(e) =>
                setReplyMap((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              placeholder="Write a reply..."
              className="w-full text-sm min-h-[60px] resize-y"
            />
            <div className="flex items-center gap-3">
              <select
                value={statusMap[item.id] ?? item.status}
                onChange={(e) =>
                  setStatusMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                className="text-sm"
              >
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => handleReply(item.id)}
                disabled={sendingMap[item.id]}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {sendingMap[item.id] ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
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

export default FeedbackTab;
