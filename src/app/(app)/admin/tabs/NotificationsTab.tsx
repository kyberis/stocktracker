"use client";

import React, { useState, useEffect } from "react";

/* ── Notifications Tab ────────────────────────────────────── */

interface BroadcastHistoryItem {
  id: string;
  title: string;
  titleEs: string;
  message: string;
  messageEs: string;
  type: string;
  createdAt: string;
}

function NotificationsTab() {
  const [title, setTitle] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [message, setMessage] = useState("");
  const [messageEs, setMessageEs] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkLabelEs, setLinkLabelEs] = useState("");
  const [targetPlan, setTargetPlan] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent?: number; error?: string } | null>(null);
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          titleEs: titleEs.trim(),
          message: message.trim(),
          messageEs: messageEs.trim(),
          link: link.trim(),
          linkLabel: linkLabel.trim(),
          linkLabelEs: linkLabelEs.trim(),
          targetPlan: targetPlan || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ sent: data.sent });
        setTitle("");
        setTitleEs("");
        setMessage("");
        setMessageEs("");
        setLink("");
        setLinkLabel("");
        setLinkLabelEs("");
        setTargetPlan("");
        // Refresh history
        const histRes = await fetch("/api/admin/notifications");
        const histData = await histRes.json();
        setHistory(histData.history ?? []);
      } else {
        setSendResult({ error: data.error || "Failed to send" });
      }
    } catch (err) {
      setSendResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Compose */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Send Broadcast Notification</h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Title (EN) *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Notification title" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Title (ES)</label>
              <input type="text" value={titleEs} onChange={(e) => setTitleEs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Titulo de la notificacion" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Message (EN) *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y" placeholder="Notification message" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Message (ES)</label>
              <textarea value={messageEs} onChange={(e) => setMessageEs(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y" placeholder="Mensaje de la notificacion" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Link (optional)</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="/tools" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Link Label (EN)</label>
              <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Learn more" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Link Label (ES)</label>
              <input type="text" value={linkLabelEs} onChange={(e) => setLinkLabelEs(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Saber mas" />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Target Plan</label>
              <select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                <option value="">All users</option>
                <option value="free">Folio (Free)</option>
                <option value="pro">Trefolio (Pro)</option>
              </select>
            </div>
            <button type="submit" disabled={sending || !title.trim() || !message.trim()} className="btn-primary text-sm px-6 disabled:opacity-50">
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>
          {sendResult && (
            <div className={`text-sm mt-2 ${sendResult.error ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {sendResult.error ? `Error: ${sendResult.error}` : `Sent to ${sendResult.sent} user${sendResult.sent !== 1 ? "s" : ""}`}
            </div>
          )}
        </form>
      </div>

      {/* History */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Broadcast History</h3>
        {loadingHistory ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No broadcasts sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id + item.createdAt} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{item.title}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 max-w-xs truncate">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsTab;
