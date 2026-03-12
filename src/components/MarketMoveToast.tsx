"use client";

import { useState, useEffect, useRef } from "react";
import { useTickerBar, type BigMover } from "@/lib/hooks/use-ticker-bar";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "market_move_toast_dismissed";
const PUSH_SENT_KEY = "market_move_push_sent";
const AUTO_DISMISS_MS = 15_000;

function sendBrowserNotification(movers: BigMover[], title: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const alreadySent = sessionStorage.getItem(PUSH_SENT_KEY);
    if (alreadySent) return;
    sessionStorage.setItem(PUSH_SENT_KEY, "1");
  } catch { /* private browsing */ }

  const lines = movers.map(
    (m) => `${m.label}: ${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%`,
  );
  const body = lines.join(" · ");

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "market-move",
        renotify: false,
        data: { url: "/" },
      } as NotificationOptions);
    }).catch(() => {
      new Notification(title, { body, icon: "/icons/icon-192.png", tag: "market-move" });
    });
  } else {
    new Notification(title, { body, icon: "/icons/icon-192.png", tag: "market-move" });
  }
}

interface Props {
  demoMode?: boolean;
}

export default function MarketMoveToast({ demoMode = false }: Props) {
  const { t } = useI18n();
  const { bigMovers, loading } = useTickerBar(demoMode);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) {
        setDismissed(true);
        return;
      }
    } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    if (loading || dismissed) return;
    if (bigMovers.length > 0) {
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
      sendBrowserNotification(bigMovers, t("marketAlertTitle") || "Market Alert");
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [bigMovers, loading, dismissed, t]);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  if (!visible || bigMovers.length === 0) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 sm:bottom-4 right-4 z-50 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 border-l-4 border-l-amber-500 rounded-xl shadow-lg animate-slide-in-right"
    >
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-amber-300">
              {t("marketAlertTitle")}
            </span>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
            aria-label={t("dismiss") || "Dismiss"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {bigMovers.map((m: BigMover) => (
            <div
              key={m.label}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 font-mono text-xs"
            >
              <span className="text-gray-600 dark:text-slate-400 font-medium">{m.label}</span>
              <span className={`font-semibold tabular-nums ${m.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {m.changePercent >= 0 ? "+" : ""}{m.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-0.5 bg-gray-100 dark:bg-slate-700 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-amber-500/50 rounded-b-xl"
          style={{ animation: `toast-dismiss-bar ${AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
