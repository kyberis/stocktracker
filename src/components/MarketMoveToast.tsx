"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTickerBar, type BigMover } from "@/lib/hooks/use-ticker-bar";
import { useI18n } from "@/lib/i18n";
import type { QuoteData } from "@/lib/types";

const DISMISS_KEY = "market_move_toast_dismissed";
const PUSH_SENT_KEY = "market_move_push_sent";
const AUTO_DISMISS_MS = 15_000;
const HOLDING_MOVE_THRESHOLD = 2;
const MAX_HOLDING_MOVERS = 5;
const QUOTES_CACHE_KEY = "trefolio-quotes-v3";

interface HoldingMover {
  ticker: string;
  name: string;
  changePercent: number;
}

function readHoldingMovers(): HoldingMover[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const quotes: Record<string, QuoteData> = parsed?.data ?? parsed;
    if (!quotes || typeof quotes !== "object") return [];

    const movers: HoldingMover[] = [];
    for (const [symbol, q] of Object.entries(quotes)) {
      if (!q || typeof q.regularMarketChangePercent !== "number") continue;
      if (Math.abs(q.regularMarketChangePercent) >= HOLDING_MOVE_THRESHOLD) {
        movers.push({
          ticker: symbol,
          name: q.shortName || symbol,
          changePercent: q.regularMarketChangePercent,
        });
      }
    }
    movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    return movers.slice(0, MAX_HOLDING_MOVERS);
  } catch {
    return [];
  }
}

function sendBrowserNotification(
  marketMovers: BigMover[],
  holdingMovers: HoldingMover[],
  title: string,
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const alreadySent = sessionStorage.getItem(PUSH_SENT_KEY);
    if (alreadySent) return;
    sessionStorage.setItem(PUSH_SENT_KEY, "1");
  } catch { /* private browsing */ }

  const fmt = (label: string, pct: number) =>
    `${label}: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;

  const lines = [
    ...marketMovers.map((m) => fmt(m.label, m.changePercent)),
    ...holdingMovers.map((h) => fmt(h.ticker, h.changePercent)),
  ];
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
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const holdingMovers = useMemo(() => (demoMode ? [] : readHoldingMovers()), [loading]);

  const hasAlerts = bigMovers.length > 0 || holdingMovers.length > 0;
  const totalMovers = bigMovers.length + holdingMovers.length;

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
    if (hasAlerts) {
      setExpanded(true);
      setCollapsed(false);
      timerRef.current = setTimeout(() => {
        setExpanded(false);
        setCollapsed(true);
      }, AUTO_DISMISS_MS);
      sendBrowserNotification(bigMovers, holdingMovers, t("marketAlertTitle") || "Market Alert");
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [bigMovers, holdingMovers, hasAlerts, loading, dismissed, t]);

  function dismiss() {
    setExpanded(false);
    setCollapsed(false);
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  if (dismissed || !hasAlerts) return null;

  if (collapsed && !expanded) {
    return (
      <button
        onClick={() => { setCollapsed(false); setExpanded(true); }}
        data-market-toast
        className="fixed bottom-20 sm:bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 border-l-4 border-l-amber-500 rounded-xl shadow-lg hover:shadow-xl transition-shadow animate-slide-in-right"
        aria-label={t("marketAlertTitle") || "Market Alert"}
      >
        <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-900 dark:text-amber-300 tabular-nums">
          {totalMovers}
        </span>
        <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>
    );
  }

  if (!expanded) return null;

  return (
    <div
      role="alert"
      data-market-toast
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

        {bigMovers.length > 0 && (
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
        )}

        {holdingMovers.length > 0 && (
          <>
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 ${bigMovers.length > 0 ? "mt-2.5" : ""} mb-1.5`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t("marketAlertYourHoldings")}
            </div>
            <div className="flex flex-col gap-1.5">
              {holdingMovers.map((h) => (
                <div
                  key={h.ticker}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 font-mono text-xs"
                >
                  <span className="text-gray-600 dark:text-slate-400 font-medium truncate mr-2" title={h.name}>
                    {h.ticker}
                  </span>
                  <span className={`font-semibold tabular-nums ${h.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {h.changePercent >= 0 ? "+" : ""}{h.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
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
