"use client";

import { useState, useRef, useCallback } from "react";
import { Minus, Plus, X, Send } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { MessageBubble } from "./MessageBubble";

type AgentType = "warren" | "clara" | "will";

const AGENT_COLORS = {
  warren: { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30", bgSoft: "bg-violet-500/10" },
  clara: { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30", bgSoft: "bg-amber-500/10" },
  will: { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/30", bgSoft: "bg-emerald-500/10" },
} as const;

const AGENT_INITIALS: Record<AgentType, string> = {
  warren: "W",
  clara: "C",
  will: "W",
};

const AGENT_NAMES: Record<AgentType, string> = {
  warren: "Warren",
  clara: "Clara",
  will: "Will",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  agent?: AgentType | null;
  content: string;
  metadata?: Record<string, unknown>;
  followUp?: {
    label: string;
    question: string;
    quickReplies?: string[];
  };
  crossAgent?: {
    agent: AgentType;
    text: string;
  };
}

export interface ThreadCardProps {
  thread: {
    id: string;
    agent: AgentType;
    topic: string;
    status: "active" | "minimized" | "closed" | "archived";
    messageCount: number;
    updatedAt: string;
    lastMessage?: string;
  };
  onStatusChange: (id: string, status: string) => void;
}

export function ThreadCard({ thread, onStatusChange }: ThreadCardProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const colors = AGENT_COLORS[thread.agent];
  const isMinimized = thread.status === "minimized";

  const fetchMessages = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await fetch(`/api/dream-team/threads/${thread.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // silently fail — thread stays empty
    }
    setLoaded(true);
  }, [thread.id, loaded]);

  const handleMinimize = () => {
    onStatusChange(thread.id, isMinimized ? "active" : "minimized");
    if (isMinimized) fetchMessages();
  };

  const handleSendReply = async () => {
    const text = replyValue.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setReplyValue("");
    setIsStreaming(true);

    const streamingMsgId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: streamingMsgId, role: "assistant", agent: thread.agent, content: "" },
    ]);

    try {
      const res = await fetch(`/api/dream-team/threads/${thread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingMsgId
                      ? { ...m, content: accumulated }
                      : m,
                  ),
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgId
            ? { ...m, content: t("dreamTeamErrorResponse" as TranslationKey) }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      setTimeout(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  };

  const handleQuickReply = (text: string) => {
    setReplyValue(text);
  };

  const timeAgo = thread.updatedAt;

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden transition-all duration-200 ${
        isMinimized ? "opacity-70" : ""
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 flex items-center gap-2 ${
          isMinimized ? "" : "border-b border-gray-100 dark:border-slate-700"
        }`}
      >
        <div
          className={`w-[26px] h-[26px] rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0 ${colors.bg}`}
        >
          {AGENT_INITIALS[thread.agent]}
        </div>
        <span className={`text-[13px] font-semibold ${colors.text}`}>
          {AGENT_NAMES[thread.agent]}
        </span>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          · {thread.topic}
        </span>
        <span className="text-[10px] bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full ml-1">
          {thread.messageCount} {t("dreamTeamMessages" as TranslationKey)}
        </span>

        {/* Last message preview (minimized only) */}
        {isMinimized && thread.lastMessage && (
          <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-auto max-w-[200px] truncate">
            {thread.lastMessage}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {!isMinimized && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500 mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {thread.status === "active"
                ? `${t("dreamTeamActive" as TranslationKey)} · ${timeAgo}`
                : timeAgo}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-0.5">
            <button
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              onClick={handleMinimize}
              title={isMinimized ? t("dreamTeamExpand" as TranslationKey) : t("dreamTeamMinimize" as TranslationKey)}
              aria-label={
                isMinimized
                  ? t("dreamTeamExpandThread" as TranslationKey)
                  : t("dreamTeamMinimizeThread" as TranslationKey)
              }
            >
              {isMinimized ? <Plus size={13} /> : <Minus size={13} />}
            </button>
            <button
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              onClick={() => onStatusChange(thread.id, "closed")}
              title={t("dreamTeamClose" as TranslationKey)}
              aria-label={t("dreamTeamCloseThread" as TranslationKey)}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!isMinimized && (
        <>
          <div
            ref={bodyRef}
            className="p-4 flex flex-col gap-3 max-h-[500px] overflow-y-auto"
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                <MessageBubble
                  role={msg.role}
                  agent={msg.agent}
                  content={msg.content}
                  metadata={msg.metadata}
                  isStreaming={isStreaming && msg.content === "" && msg.role === "assistant"}
                />

                {/* Cross-agent badge */}
                {msg.crossAgent && (
                  <div className="mt-2 ml-9 px-3 py-2 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="text-emerald-500 text-sm">↗</span>
                    <span dangerouslySetInnerHTML={{ __html: msg.crossAgent.text }} />
                  </div>
                )}

                {/* Follow-up question */}
                {msg.followUp && (
                  <div
                    className={`mt-2 ml-9 px-3 py-2 rounded-lg text-xs text-gray-800 dark:text-slate-200 ${
                      thread.agent === "clara"
                        ? "bg-amber-500/[0.08] border border-amber-500/20"
                        : thread.agent === "will"
                          ? "bg-emerald-500/[0.08] border border-emerald-500/20"
                          : "bg-violet-500/[0.08] border border-violet-500/20"
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1">
                      {msg.followUp.label}
                    </div>
                    {msg.followUp.question}

                    {/* Quick replies */}
                    {msg.followUp.quickReplies && msg.followUp.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {msg.followUp.quickReplies.map((reply) => (
                          <button
                            key={reply}
                            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            onClick={() => handleQuickReply(reply)}
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reply input */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-700 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[13px] text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
              placeholder={`${t("dreamTeamReplyTo" as TranslationKey)} ${AGENT_NAMES[thread.agent]}...`}
              value={replyValue}
              onChange={(e) => setReplyValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              disabled={isStreaming}
              aria-label={`${t("dreamTeamReplyTo" as TranslationKey)} ${AGENT_NAMES[thread.agent]}`}
            />
            <button
              className="w-[34px] h-[34px] rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              onClick={handleSendReply}
              disabled={isStreaming || !replyValue.trim()}
              aria-label={t("dreamTeamSendMessage" as TranslationKey)}
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
