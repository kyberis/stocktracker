"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

interface FeedbackItem {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  adminReply: string;
  createdAt: string;
  repliedAt: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useI18n();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSuccess(false);
      setError("");
    }
  }, [isOpen, loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send feedback.");
        return;
      }
      setSubject("");
      setMessage("");
      setSuccess(true);
      loadHistory();
    } catch {
      setError("Failed to send feedback.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const statusColor = (status: string) => {
    if (status === "answered") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    if (status === "closed") return "bg-slate-500/15 text-slate-400 border-slate-500/20";
    return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  };

  const statusLabel = (status: string) => {
    if (status === "answered") return t("feedbackAnswered");
    if (status === "closed") return t("feedbackClosed");
    return t("feedbackOpen");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("feedbackTitle")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1">
              {t("feedbackSubject")}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("feedbackSubjectPlaceholder")}
              className="w-full"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-300 mb-1">
              {t("feedbackMessage")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("feedbackPlaceholder")}
              className="w-full min-h-[100px] resize-y"
              maxLength={2000}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-500">{t("feedbackSuccess")}</p>
          )}
          <button
            type="submit"
            disabled={sending || !subject.trim() || !message.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sending ? t("loading") : t("feedbackSubmit")}
          </button>
        </form>

        {/* History */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t("feedbackYourHistory")}
          </h3>
          {loadingHistory ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("loading")}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("feedbackEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.subject}
                    </h4>
                    <span
                      className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusColor(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {item.adminReply && (
                    <div className="mt-2 pl-3 border-l-2 border-emerald-500/40">
                      <p className="text-[10px] font-medium text-emerald-500 mb-1">
                        {t("feedbackReply")}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                        {item.adminReply}
                      </p>
                    </div>
                  )}
                  {!item.adminReply && item.status === "open" && (
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">
                      {t("feedbackNoReplyYet")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
