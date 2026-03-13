"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTrack } from "@/lib/use-track";

type FeedbackType = "feedback" | "bug";

interface FeedbackItem {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  type: FeedbackType;
  status: "open" | "answered" | "closed";
  adminReply: string;
  createdAt: string;
  repliedAt: string;
  userContext: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function buildClientContext(locale: string): string {
  return JSON.stringify({
    page: window.location.href,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale,
    timestamp: new Date().toISOString(),
  });
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t, language } = useI18n();
  const track = useTrack();
  const openedRef = useRef(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("feedback");
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
      if (!openedRef.current) {
        openedRef.current = true;
        track("feedback_opened");
      }
      loadHistory();
      setSuccess(false);
      setError("");
    } else {
      openedRef.current = false;
    }
  }, [isOpen, loadHistory, track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        subject: subject.trim(),
        message: message.trim(),
        type: feedbackType,
      };
      if (feedbackType === "bug") {
        payload.userContext = buildClientContext(language);
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send feedback.");
        return;
      }
      track("feedback_submitted");
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

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const isBug = feedbackType === "bug";

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
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="feedback-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t("feedbackTitle")}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden" role="radiogroup" aria-label="Feedback type">
            <button
              type="button"
              role="radio"
              aria-checked={!isBug}
              onClick={() => setFeedbackType("feedback")}
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                !isBug
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {t("feedbackTypeFeedback")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isBug}
              onClick={() => setFeedbackType("bug")}
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                isBug
                  ? "bg-red-500 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {t("feedbackTypeBug")}
            </button>
          </div>

          <div>
            <label htmlFor="feedback-subject" className="block text-sm text-gray-600 dark:text-slate-300 mb-1">
              {t("feedbackSubject")}
            </label>
            <input
              id="feedback-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isBug ? t("feedbackBugSubjectPlaceholder") : t("feedbackSubjectPlaceholder")}
              className="w-full"
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="feedback-message" className="block text-sm text-gray-600 dark:text-slate-300 mb-1">
              {t("feedbackMessage")}
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isBug ? t("feedbackBugPlaceholder") : t("feedbackPlaceholder")}
              className="w-full min-h-[100px] resize-y"
              maxLength={2000}
            />
          </div>
          {isBug && (
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              {t("feedbackContextPage")}: {typeof window !== "undefined" ? window.location.pathname : ""}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-500" aria-live="polite">{t("feedbackSuccess")}</p>
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.type === "bug" && (
                        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/20">
                          {t("feedbackTypeBug")}
                        </span>
                      )}
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.subject}
                      </h4>
                    </div>
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
