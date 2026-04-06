"use client";

import { useState } from "react";
import { UserPlus, MessageCircle, Clock, Loader2 } from "lucide-react";

interface ConnectionButtonProps {
  connectionStatus: string | null;
  targetUserId: string;
  targetSlug?: string;
  onConnect?: () => void;
  onMessage?: () => void;
  size?: "sm" | "md";
}

export function ConnectionButton({ connectionStatus, targetUserId, targetSlug, onConnect, onMessage, size = "md" }: ConnectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(connectionStatus);

  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/social/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, targetSlug }),
      });
      if (res.ok) {
        setStatus("pending");
        onConnect?.();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMessage() {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/connections/${targetUserId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const { token } = await res.json();
        window.location.href = `/network/conversations?chat=${token}`;
      }
    } finally {
      setLoading(false);
    }
    onMessage?.();
  }

  if (status === "connected") {
    return (
      <div className="flex gap-2">
        <button onClick={handleMessage} disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-button,8px)] bg-[var(--card-hover)] font-semibold text-[var(--foreground)] hover:brightness-110 transition-colors ${sizeClasses}`}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          Message
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <button disabled className={`inline-flex items-center gap-1.5 rounded-[var(--radius-button,8px)] bg-[var(--card)] font-semibold text-[var(--muted)] border border-[var(--border)] cursor-not-allowed ${sizeClasses}`}>
        <Clock size={14} />
        Pending
      </button>
    );
  }

  return (
    <button onClick={handleConnect} disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-button,8px)] bg-[var(--accent)] font-semibold text-white hover:brightness-110 transition-colors ${sizeClasses}`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
      Connect
    </button>
  );
}
