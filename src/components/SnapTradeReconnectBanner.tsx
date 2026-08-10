"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import type { DisabledBrokerageConnection } from "@/hooks/import-types";

const DISMISS_KEY = "snaptrade_reconnect_dismissed";

// The dismissal is scoped to the specific set of disabled connections the user
// saw when they dismissed — so a newly-disabled connection (or the same one
// still disabled after reconnecting and failing again) reopens the banner
// instead of it staying hidden forever.
function dismissedIdsKey(connections: DisabledBrokerageConnection[]): string {
  return connections.map((c) => c.id).sort().join(",");
}

export default function SnapTradeReconnectBanner() {
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const [needsAttention, setNeedsAttention] = useState(false);
  const [disabledConnections, setDisabledConnections] = useState<DisabledBrokerageConnection[]>([]);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;

    const form = new FormData();
    form.append("action", "get-connection");
    fetch("/api/snaptrade", { method: "POST", body: form })
      .then((r) => r.json())
      .then((data) => {
        if (data.connected && data.needsAttention) {
          setNeedsAttention(true);
          setDisabledConnections(data.disabledConnections || []);
          setLastSyncedAt(data.lastSyncedAt || null);
        }
        try {
          setDismissedKey(localStorage.getItem(DISMISS_KEY));
        } catch { /* private browsing */ }
      })
      .catch(() => {});
  }, [demoMode]);

  const dismiss = useCallback(() => {
    const key = dismissedIdsKey(disabledConnections);
    setDismissedKey(key);
    try { localStorage.setItem(DISMISS_KEY, key); } catch { /* ignore */ }
  }, [disabledConnections]);

  const dismissed = dismissedKey !== null && dismissedKey === dismissedIdsKey(disabledConnections);
  if (dismissed || !needsAttention) return null;

  const brokerNames = disabledConnections.map((c) => c.brokerageName).filter(Boolean);
  const count = disabledConnections.length;

  return (
    <div className="relative rounded-xl border border-amber-500/30 dark:border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-white/80 to-orange-500/10 dark:from-amber-500/10 dark:via-slate-800/60 dark:to-orange-500/10 p-4 sm:p-5 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-amber-500/15 items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {count === 1
                ? t("brokerSyncExpiredSingle") || "Broker connection expired"
                : (t("brokerSyncExpiredMultiple") || "{count} broker connections expired").replace("{count}", String(count))
              }
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
              {brokerNames.length > 0
                ? (t("brokerSyncExpiredBannerDesc") || "Credentials for {brokers} have expired. Reconnect to resume auto-sync.").replace("{brokers}", brokerNames.join(", "))
                : t("brokerSyncExpiredBannerGeneric") || "Some broker credentials have expired. Reconnect to resume auto-sync."
              }
            </p>
            {lastSyncedAt && (
              <p className="text-[10px] text-amber-600/60 dark:text-amber-400/50 mt-1">
                {t("brokerSyncLastSynced") || "Last synced"}: {new Date(lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/import?method=snaptrade_api"
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm min-h-[44px]"
          >
            {t("brokerSyncReconnect") || "Reconnect"}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-200/50 dark:text-amber-500 dark:hover:text-amber-300 dark:hover:bg-amber-700/30 transition-colors"
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
