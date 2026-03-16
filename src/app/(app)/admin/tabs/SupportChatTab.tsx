"use client";

import React, { useEffect, useState } from "react";

/* ── Support Chat Tab ─────────────────────────────────────── */

interface SupportChatListItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  status: "active" | "resolved" | "escalated";
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportChatConversation {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  messages: { role: "user" | "assistant"; content: string; timestamp: string }[];
  status: "active" | "resolved" | "escalated";
  createdAt: string;
  updatedAt: string;
}

function SupportChatTab() {
  const [conversations, setConversations] = useState<SupportChatListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "escalated" | "resolved">("all");
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedConv, setExpandedConv] = useState<SupportChatConversation | null>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const limit = 20;

  const loadConversations = async (reset = false) => {
    const off = reset ? 0 : offset;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(limit),
        offset: String(off),
      });
      const res = await fetch(`/api/admin/support-chat?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setConversations(data.conversations ?? []);
          setOffset(limit);
        } else {
          setConversations((prev) => [...prev, ...(data.conversations ?? [])]);
          setOffset((o) => o + limit);
        }
        setTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadExpanded = async (id: string) => {
    setLoadingExpanded(true);
    try {
      const res = await fetch(`/api/admin/support-chat/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setExpandedConv(data.conversation);
        setStatusMap((prev) => ({ ...prev, [id]: data.conversation.status }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingExpanded(false);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedConv(null);
      return;
    }
    setExpandedId(id);
    loadExpanded(id);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setSavingStatus(id);
    try {
      const res = await fetch(`/api/admin/support-chat/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatusMap((prev) => ({ ...prev, [id]: newStatus }));
        setExpandedConv((prev) => (prev && prev.id === id ? { ...prev, status: newStatus as SupportChatConversation["status"] } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus as SupportChatListItem["status"] } : c))
        );
      }
    } catch {
      // ignore
    } finally {
      setSavingStatus(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === "active") return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    if (status === "escalated") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  };

  const planColor = (plan: string) => {
    if (plan === "pro") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400";
    if (plan === "starter") return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    return "bg-gray-100 text-gray-600 dark:bg-slate-600/30 dark:text-slate-400";
  };

  if (loading && conversations.length === 0) return <p className="text-gray-500 dark:text-slate-400">Loading...</p>;
  if (conversations.length === 0 && statusFilter === "all") return <p className="text-gray-500 dark:text-slate-400">No conversations yet.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "escalated", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s
                ? "bg-indigo-600 text-white dark:bg-indigo-500"
                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <p className="text-gray-500 dark:text-slate-400">No conversations with status &quot;{statusFilter}&quot;.</p>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <div key={c.id} className="card p-4 space-y-3">
              <button
                type="button"
                onClick={() => handleExpand(c.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white">{c.username}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{c.email}</span>
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${planColor(c.plan)}`}>
                        {c.plan}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 line-clamp-2">
                      {c.firstMessage ? (c.firstMessage.length > 200 ? `${c.firstMessage.slice(0, 200)}…` : c.firstMessage) : "—"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {c.messageCount} messages · Created {new Date(c.createdAt).toLocaleDateString()} · Updated {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </button>

              {expandedId === c.id && (
                <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
                  {loadingExpanded ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">Loading conversation...</p>
                  ) : expandedConv ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <select
                          value={statusMap[c.id] ?? expandedConv.status}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          disabled={savingStatus === c.id}
                          className="text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="escalated">Escalated</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        {savingStatus === c.id && <span className="text-xs text-gray-500">Saving...</span>}
                      </div>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {expandedConv.messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === "user"
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          {conversations.length < total && (
            <button
              onClick={() => loadConversations(false)}
              disabled={loading}
              className="btn-secondary text-sm w-full"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SupportChatTab;
