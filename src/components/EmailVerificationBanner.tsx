"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "trefolio_email_verify_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const ts = localStorage.getItem(DISMISS_KEY);
    return ts ? Date.now() - Number(ts) < DISMISS_DURATION_MS : false;
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = useCallback(async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      if (res.ok) setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  if (!user || user.emailVerified || dismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span className="text-amber-800 dark:text-amber-200 truncate">
            {t("emailVerifyBanner")}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sent ? (
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">{t("emailVerifySent")}</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 disabled:opacity-50"
            >
              {sending ? "…" : t("emailVerifyResend")}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-amber-400 dark:text-amber-500/60 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
