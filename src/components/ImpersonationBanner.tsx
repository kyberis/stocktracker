"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export default function ImpersonationBanner() {
  const { user, exitImpersonation } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleExit = useCallback(async () => {
    setBusy(true);
    try {
      await exitImpersonation();
    } finally {
      setBusy(false);
    }
  }, [exitImpersonation]);

  if (!user?.impersonation) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-violet-600/15 dark:bg-violet-500/10 border-b border-violet-500/30 px-4 py-2.5 z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 min-w-0 text-violet-950 dark:text-violet-100">
          <svg className="w-4 h-4 text-violet-600 dark:text-violet-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="min-w-0">
            <span className="font-medium">{t("impersonationBannerBefore")}</span>{" "}
            <span className="font-mono font-semibold">@{user.username}</span>
            <span className="text-violet-800/90 dark:text-violet-200/90"> — {t("impersonationBannerAfter")}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          disabled={busy}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {busy ? "…" : t("impersonationExit")}
        </button>
      </div>
    </div>
  );
}
