"use client";

import React, { useCallback, useEffect, useState } from "react";

interface Translation {
  id: string;
  digestId: string;
  language: string;
  title: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
}

interface Digest {
  id: string;
  gmailMessageId: string;
  sender: string;
  originalSubject: string;
  receivedAt: string;
  mentionedTickers: string[];
  sectors: string[];
  sentiment: string;
  aiModel: string;
  tokensUsed: number;
  status: "draft" | "published" | "archived";
  publishedAt: string;
  emailSent: boolean;
  createdAt: string;
  translations?: Translation[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  bearish: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminMarketDigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDigest, setExpandedDigest] = useState<Digest | null>(null);
  const [activeTab, setActiveTab] = useState("en");
  const [editingTranslation, setEditingTranslation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editKeyPoints, setEditKeyPoints] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showTestForm, setShowTestForm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/market-digests${params}`, { cache: "no-store" });
      const data = await res.json();
      setDigests(data.digests || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDigest(null);
      return;
    }
    setExpandedId(id);
    try {
      const res = await fetch(`/api/admin/market-digests/${id}`, { cache: "no-store" });
      const data = await res.json();
      setExpandedDigest(data.digest || null);
      const translations = data.digest?.translations || [];
      if (translations.length > 0) {
        setActiveTab(translations.find((t: Translation) => t.language === "en")?.language || translations[0].language);
      }
    } catch {
      setExpandedDigest(null);
    }
  }, [expandedId]);

  const handlePublish = async (id: string) => {
    setActionLoading(`publish-${id}`);
    await fetch(`/api/admin/market-digests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    setActionLoading(null);
    setExpandedId(null);
    setExpandedDigest(null);
    await load();
  };

  const handleArchive = async (id: string) => {
    setActionLoading(`archive-${id}`);
    await fetch(`/api/admin/market-digests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    setActionLoading(null);
    setExpandedId(null);
    setExpandedDigest(null);
    await load();
  };

  const handleSendEmail = async (id: string) => {
    if (!confirm("Send this digest as an email to all verified users?")) return;
    setActionLoading(`send-${id}`);
    try {
      const res = await fetch(`/api/admin/market-digests/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        alert(`Email sent to ${data.sent} users (${data.failed} failed).`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to send emails.");
    }
    setActionLoading(null);
    await load();
  };

  const handleTestSend = async (id: string) => {
    if (!testEmail.trim()) return;
    setActionLoading(`test-${id}`);
    try {
      const res = await fetch(`/api/admin/market-digests/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim(), testLanguage: activeTab }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Test email sent to ${data.to} (${data.language}).`);
        setShowTestForm(null);
        setTestEmail("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to send test email.");
    }
    setActionLoading(null);
  };

  const startEditing = (t: Translation) => {
    setEditingTranslation(t.id);
    setEditTitle(t.title);
    setEditSummary(t.summary);
    setEditKeyPoints(t.keyPoints.join("\n"));
  };

  const saveTranslation = async (digestId: string) => {
    if (!editingTranslation) return;
    setActionLoading(`save-${editingTranslation}`);
    await fetch(`/api/admin/market-digests/${digestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translationId: editingTranslation,
        title: editTitle,
        summary: editSummary,
        keyPoints: editKeyPoints.split("\n").filter(Boolean),
      }),
    });
    setEditingTranslation(null);
    setActionLoading(null);
    await loadDetail(digestId);
  };

  const filters = ["all", "draft", "published", "archived"] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Market Digests</h2>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      ) : digests.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No digests found.</p>
      ) : (
        <div className="space-y-2">
          {digests.map((d) => (
            <div key={d.id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => loadDetail(d.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLORS[d.status]}`}>
                  {d.status}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${SENTIMENT_COLORS[d.sentiment] || SENTIMENT_COLORS.neutral}`}>
                  {d.sentiment || "neutral"}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {d.originalSubject}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0">
                  {new Date(d.receivedAt).toLocaleDateString()}
                </span>
                {d.emailSent && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Emailed
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === d.id ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedId === d.id && expandedDigest && (
                <div className="border-t border-gray-200 dark:border-slate-700 p-4">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">From:</span>
                      <div className="text-gray-900 dark:text-white font-mono">{expandedDigest.sender}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Model:</span>
                      <div className="text-gray-900 dark:text-white">{expandedDigest.aiModel}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Tokens:</span>
                      <div className="text-gray-900 dark:text-white">{expandedDigest.tokensUsed.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Tickers:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {expandedDigest.mentionedTickers.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Translation tabs */}
                  {expandedDigest.translations && expandedDigest.translations.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">
                        {expandedDigest.translations.map((t) => (
                          <button
                            key={t.language}
                            onClick={() => { setActiveTab(t.language); setEditingTranslation(null); }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              activeTab === t.language
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {t.language.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      {expandedDigest.translations
                        .filter((t) => t.language === activeTab)
                        .map((t) => (
                          <div key={t.id}>
                            {editingTranslation === t.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Title</label>
                                  <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Summary</label>
                                  <textarea
                                    value={editSummary}
                                    onChange={(e) => setEditSummary(e.target.value)}
                                    rows={6}
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Key Points (one per line)</label>
                                  <textarea
                                    value={editKeyPoints}
                                    onChange={(e) => setEditKeyPoints(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveTranslation(expandedDigest.id)}
                                    disabled={actionLoading === `save-${t.id}`}
                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {actionLoading === `save-${t.id}` ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => setEditingTranslation(null)}
                                    className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.title}</h3>
                                  {expandedDigest.status === "draft" && (
                                    <button
                                      onClick={() => startEditing(t)}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-3"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap mb-3">
                                  {t.summary}
                                </div>
                                {t.keyPoints.length > 0 && (
                                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-slate-300 space-y-1">
                                    {t.keyPoints.map((p, i) => (
                                      <li key={i}>{p}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Test send form */}
                  {showTestForm === expandedDigest.id && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Send test email</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          (will send the <strong>{activeTab.toUpperCase()}</strong> translation)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="recipient@example.com"
                          className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                        <button
                          onClick={() => handleTestSend(expandedDigest.id)}
                          disabled={!testEmail.trim() || !!actionLoading}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                        >
                          {actionLoading === `test-${expandedDigest.id}` ? "Sending..." : "Send Test"}
                        </button>
                        <button
                          onClick={() => { setShowTestForm(null); setTestEmail(""); }}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                    {expandedDigest.status === "draft" && (
                      <button
                        onClick={() => handlePublish(expandedDigest.id)}
                        disabled={!!actionLoading}
                        className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actionLoading === `publish-${expandedDigest.id}` ? "Publishing..." : "Approve & Publish"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowTestForm(showTestForm === expandedDigest.id ? null : expandedDigest.id)}
                      disabled={!!actionLoading}
                      className="px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                    >
                      Send Test Email
                    </button>
                    {expandedDigest.status === "published" && !expandedDigest.emailSent && (
                      <button
                        onClick={() => handleSendEmail(expandedDigest.id)}
                        disabled={!!actionLoading}
                        className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === `send-${expandedDigest.id}` ? "Sending..." : "Send Email to All Users"}
                      </button>
                    )}
                    {expandedDigest.status !== "archived" && (
                      <button
                        onClick={() => handleArchive(expandedDigest.id)}
                        disabled={!!actionLoading}
                        className="px-4 py-1.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
