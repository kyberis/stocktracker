"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";

const SESSION_KEY = "syncConfidenceResult";
const LAST_KNOWN_KEY = "syncConfidenceLastKnown";
const AUTO_DISMISS_MS = 8000;

interface SyncResult {
  variant: "manual" | "auto" | "nothing";
  positions: number;
  newTx: number;
  failedCount?: number;
  brokerNames: string[];
  ts: string;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SyncConfidenceBanner() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setResult(null), 300);
  }, []);

  useEffect(() => {
    if (!user || user.plan === "free") return;

    let found: SyncResult | null = null;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        found = JSON.parse(raw) as SyncResult;
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch { /* private browsing */ }

    if (found) {
      setResult(found);
      setVisible(true);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      return;
    }

    const form = new FormData();
    form.append("action", "get-connection");
    fetch("/api/snaptrade", { method: "POST", body: form })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.connected || data.needsAttention || !data.lastSyncedAt) return;
        let lastKnown: string | null = null;
        try { lastKnown = localStorage.getItem(LAST_KNOWN_KEY); } catch { /* ignore */ }

        if (lastKnown !== data.lastSyncedAt) {
          try { localStorage.setItem(LAST_KNOWN_KEY, data.lastSyncedAt); } catch { /* ignore */ }
          const brokerNames: string[] = (data.brokerSyncs || [])
            .map((b: { brokerageName: string }) => b.brokerageName)
            .filter(Boolean);

          // Fetch the actual count of transactions imported in this auto-sync
          const txUrl = new URL("/api/transactions", window.location.origin);
          txUrl.searchParams.set("source", "snaptrade");
          txUrl.searchParams.set("since", data.lastSyncedAt);
          fetch(txUrl.toString())
            .then((r) => (r.ok ? r.json() : []))
            .then((txs: unknown[]) => {
              const newTx = Array.isArray(txs) ? txs.length : 0;
              setResult({
                variant: "auto",
                positions: 0,
                newTx,
                brokerNames,
                ts: data.lastSyncedAt,
              });
              setVisible(true);
              timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
            })
            .catch(() => {
              // Show banner anyway without count
              setResult({ variant: "auto", positions: 0, newTx: 0, brokerNames, ts: data.lastSyncedAt });
              setVisible(true);
              timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
            });
        }
      })
      .catch(() => {});

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.plan]);

  if (!result || !visible) return null;

  const brokerLabel = result.brokerNames.length > 0
    ? result.brokerNames.join(", ")
    : t("brokerSyncAutoSyncActive");

  const timeAgo = formatTimeAgo(result.ts);
  const isAuto    = result.variant === "auto";
  const isNothing = result.variant === "nothing";

  const title = isAuto
    ? t("syncConfidenceAutoTitle")
    : isNothing
      ? t("syncConfidenceNothingTitle")
      : t("syncConfidenceManualTitle");

  // Build "View changes" URL — links to filtered transaction list
  const viewChangesUrl = (() => {
    const u = new URL("/import/synced", "http://x");
    u.searchParams.set("since", result.ts);
    if (result.brokerNames.length > 0) u.searchParams.set("broker", result.brokerNames[0]);
    return u.pathname + u.search;
  })();

  // Inline gradient styles — use lighter values in light mode
  const gradientBg = isNothing ? undefined : isAuto
    ? isDark
      ? "linear-gradient(135deg, rgba(6,182,212,0.09) 0%, var(--background,#0f172a) 50%, rgba(6,182,212,0.05) 100%)"
      : "linear-gradient(135deg, rgba(6,182,212,0.06) 0%, #ffffff 50%, rgba(6,182,212,0.03) 100%)"
    : isDark
      ? "linear-gradient(135deg, rgba(16,185,129,0.09) 0%, var(--background,#0f172a) 50%, rgba(16,185,129,0.05) 100%)"
      : "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, #ffffff 50%, rgba(16,185,129,0.03) 100%)";

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border px-4 py-3
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
        ${isNothing
          ? "border-slate-300/60 bg-slate-100/60 dark:border-slate-700/50 dark:bg-slate-800/40"
          : isAuto
            ? "border-cyan-400/40 dark:border-cyan-500/20"
            : "border-emerald-400/50 dark:border-emerald-500/25"
        }
      `}
      style={{ background: gradientBg }}
      role="status"
      aria-live="polite"
    >
      {/* Glow orb — dark mode only (would look weird on white) */}
      {!isNothing && isDark && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
          style={{
            background: isAuto
              ? "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Auto-dismiss progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-xl"
        style={{
          background: isAuto
            ? "linear-gradient(90deg, #06b6d4, #10b981)"
            : isNothing
              ? isDark ? "#334155" : "#cbd5e1"
              : "linear-gradient(90deg, #10b981, #06b6d4)",
          animation: `syncBannerShrink ${AUTO_DISMISS_MS}ms linear forwards`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        {/* Left: icon + text */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icon container */}
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              isAuto
                ? "border-cyan-400/30 bg-cyan-500/10 dark:border-cyan-500/20 dark:bg-cyan-500/10"
                : isNothing
                  ? "border-slate-300 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/40"
                  : "border-emerald-400/40 bg-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/10"
            }`}
          >
            {isAuto ? (
              <svg
                className="h-4 w-4 text-cyan-600 dark:text-cyan-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            ) : (
              <svg
                className={`h-4 w-4 ${isNothing ? "text-slate-400 dark:text-slate-500" : "text-emerald-600 dark:text-emerald-400"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            )}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                {title}
              </span>

              {/* Broker badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  isAuto
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-300"
                    : isNothing
                      ? "border-slate-300 bg-slate-200/50 text-slate-500 dark:border-slate-700 dark:bg-transparent dark:text-slate-400"
                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isAuto ? "bg-cyan-500" : isNothing ? "bg-slate-400" : "bg-emerald-500"
                  }`}
                  style={{ animation: isNothing ? "none" : "syncDotPulse 2s infinite" }}
                />
                {brokerLabel}
              </span>
            </div>

            {/* Pills row */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {/* Positions */}
              {!isAuto && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100/70 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700/60 dark:bg-white/5 dark:text-slate-300">
                  <svg className="h-2.5 w-2.5 shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  {t("syncConfidencePositions").replace("{count}", String(result.positions))}
                </span>
              )}

              {/* New transactions */}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  result.newTx > 0 && !isAuto
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:text-emerald-300"
                    : "border-slate-300 bg-slate-100/60 text-slate-500 dark:border-slate-700 dark:bg-white/[0.03] dark:text-slate-500"
                }`}
              >
                <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  {result.newTx > 0 && !isAuto
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  }
                </svg>
                {isAuto
                  ? t("brokerSyncAutoSyncActive")
                  : result.newTx > 0
                    ? t("syncConfidenceNewTx").replace("{count}", String(result.newTx))
                    : t("syncConfidenceNoNewTx")
                }
              </span>

              {/* Timestamp */}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100/60 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-500">
                <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {timeAgo}
              </span>
            </div>

            {(result.failedCount ?? 0) > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                {(t("importPartialFailure") || "{count} transaction(s) could not be imported. Try syncing again or contact support if this persists.").replace("{count}", String(result.failedCount))}
              </p>
            )}
          </div>
        </div>

        {/* Right: CTA + dismiss */}
        <div className="flex shrink-0 items-center gap-1.5">
          {result.newTx > 0 && (
          <Link
            href={viewChangesUrl}
            className={`hidden sm:inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              isAuto
                ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
                : isNothing
                  ? "border-slate-300 bg-slate-200/50 text-slate-500 hover:bg-slate-200 dark:border-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-white/5"
                  : "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            }`}
            onClick={dismiss}
          >
            {t("syncConfidenceViewChanges")}
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          )}

          <button
            onClick={dismiss}
            aria-label={t("syncConfidenceDismiss")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes syncBannerShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes syncDotPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
