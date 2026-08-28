"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentBoardAgent } from "@/lib/agent-board/types";

export type AgentBoardMessageView = {
  id: string;
  agent: AgentBoardAgent;
  kind: string;
  body: string;
  chipLabel: string;
  chipPrompt: string;
  priority: number;
  readAt: string | null;
  createdAt: string;
};

export function useAgentBoard(enabled: boolean) {
  const [messages, setMessages] = useState<AgentBoardMessageView[]>([]);
  const [boardEnabled, setBoardEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agent-board/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        enabled?: boolean;
        messages?: AgentBoardMessageView[];
      };
      setBoardEnabled(Boolean(data.enabled));
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setBoardEnabled(false);
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled, refresh]);

  const markRead = useCallback(async (messageId: string) => {
    await fetch(`/api/agent-board/messages/${messageId}/read`, { method: "POST" });
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, readAt: new Date().toISOString() } : m)),
    );
  }, []);

  const dismiss = useCallback(async (messageId: string) => {
    await fetch(`/api/agent-board/messages/${messageId}/dismiss`, { method: "POST" });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    const res = await fetch("/api/agent-board/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) return false;
    setBoardEnabled(next);
    if (next) {
      await fetch("/api/agent-board/refresh", { method: "POST" }).catch(() => {});
      await refresh();
    } else {
      setMessages([]);
    }
    return true;
  }, [refresh]);

  return {
    messages,
    boardEnabled,
    loading,
    refresh,
    markRead,
    dismiss,
    setEnabled,
  };
}
