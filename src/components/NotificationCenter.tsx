"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { AppNotification, NotificationType } from "@/lib/types";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "welcome":
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0 0v2.5m0-2.5h2.5M7 14H4.5m4.571-8.285A13.072 13.072 0 0116.5 3c.527 0 1.042.034 1.546.1a.75.75 0 01.637.849c-.213 1.58-.818 3.032-1.696 4.27" />
          </svg>
        </span>
      );
    case "upgrade":
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </span>
      );
    case "downgrade":
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </span>
      );
    case "admin":
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      );
  }
}

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (lang === "es") {
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffH < 24) return `hace ${diffH}h`;
    if (diffD < 30) return `hace ${diffD}d`;
    return new Date(dateStr).toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  }
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { language, t } = useI18n();
  const lang = language;
  const track = useTrack();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const focusTrapRef = useFocusTrap(isOpen, onClose);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuthRedirect("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      track("notification_center_viewed", { total: String(notifications.length) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const markAllRead = async () => {
    const count = notifications.filter((n) => !n.read).length;
    try {
      await fetchWithAuthRedirect("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      track("notifications_mark_all_read", { count: String(count) });
    } catch {
      /* ignore */
    }
  };

  const markOneRead = async (id: string, type?: string) => {
    try {
      await fetchWithAuthRedirect("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      track("notification_read", { notification_id: id, notification_type: type || "" });
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-x-0 top-7 bottom-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        className="relative w-full max-w-md bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col h-full animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 id="notification-center-title" className="text-base font-bold text-gray-900 dark:text-white">
                {lang === "es" ? "Notificaciones" : "Notifications"}
              </h2>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {lang === "es" ? `${unreadCount} sin leer` : `${unreadCount} unread`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {lang === "es" ? "Marcar todo leido" : "Mark all read"}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400 dark:text-slate-500">
              {lang === "es" ? "Cargando..." : "Loading..."}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <svg className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {lang === "es" ? "No tienes notificaciones" : "No notifications yet"}
              </p>
            </div>
          )}

          {notifications.map((notif) => {
            const resolveField = (en: string, es: string | undefined) => {
              if (en.startsWith("i18n:")) {
                const parts = en.slice(5).split("|");
                const key = parts[0] as Parameters<typeof t>[0];
                let resolved = t(key);
                for (let i = 1; i < parts.length; i++) {
                  const param = parts[i];
                  const formatted = /^\d{4}-\d{2}-\d{2}/.test(param)
                    ? new Date(param).toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" })
                    : param;
                  resolved = resolved.replace(`{${i - 1}}`, formatted);
                }
                return resolved;
              }
              return lang === "es" && es ? es : en;
            };
            const title = resolveField(notif.title, notif.titleEs);
            const message = resolveField(notif.message, notif.messageEs);
            const linkLabel = resolveField(notif.linkLabel || "", notif.linkLabelEs);

            return (
              <div
                key={notif.id}
                className={`px-5 py-4 border-b border-gray-50 dark:border-slate-700/50 transition-colors ${
                  !notif.read ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""
                }`}
                onClick={() => { if (!notif.read) markOneRead(notif.id, notif.type); }}
              >
                <div className="flex gap-3">
                  {typeIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className={`text-sm font-semibold truncate ${!notif.read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"}`}>
                        {title}
                      </h3>
                      <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500">
                        {timeAgo(notif.createdAt, lang)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {message}
                    </p>
                    {notif.link && linkLabel && (
                      <Link
                        href={notif.link}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notif.read) markOneRead(notif.id, notif.type);
                          track("notification_link_clicked", { notification_type: notif.type, link: notif.link });
                        }}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {linkLabel}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                    {!notif.read && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1 align-middle" aria-label="Unread" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
