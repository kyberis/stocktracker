"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NotificationCenter from "./NotificationCenter";
import { useTrack } from "@/lib/use-track";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";

const NOTIFICATION_POLL_INTERVAL_MS = 180_000;

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const track = useTrack();

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetchWithAuthRedirect("/api/notifications?countOnly=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      /* ignore network errors */
    }
  }, []);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, NOTIFICATION_POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  const handleOpen = () => {
    setIsOpen(true);
    track("notification_center_opened", { unread_count: String(unreadCount) });
  };

  const handleClose = () => {
    setIsOpen(false);
    fetchCount();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative min-h-11 min-w-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)]"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationCenter isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
