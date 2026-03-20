"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTrack } from "@/lib/use-track";
import AiMarkdown from "@/components/AiMarkdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SupportChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalate: () => void;
  welcomeMessage?: string;
}

function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SupportChatWidget({
  isOpen,
  onClose,
  onEscalate,
  welcomeMessage,
}: SupportChatWidgetProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { holdings, quotes, activePortfolioCurrency } = usePortfolio();
  const track = useTrack();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [shareContext, setShareContext] = useState(false);
  const [conversationId] = useState(() => generateId());
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const openedRef = useRef(false);

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (isOpen && !openedRef.current) {
      openedRef.current = true;
      track("support_chat_opened");
    }
    if (!isOpen) {
      openedRef.current = false;
    }
  }, [isOpen, track]);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    try {
      const body: Record<string, unknown> = {
        conversationId,
        messages: newMessages,
        language,
      };
      if (shareContext) {
        const totalValue = holdings.reduce((sum, h) => {
          const q = quotes[h.ticker];
          return sum + (q?.regularMarketPrice ?? h.purchasePrice) * h.shares;
        }, 0);
        body.portfolioContext = {
          holdingsCount: holdings.length,
          totalValue,
          currency: activePortfolioCurrency,
          plan: user?.plan || "free",
        };
      }

      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.reason === "rate_limited") {
          setError(t("supportChatRateLimit"));
        } else {
          setError(data.error || t("supportChatError"));
        }
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError(t("supportChatError"));
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const display = accumulated.replace(/\n\[TOKENS:\d+\]$/, "");
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: display };
          return copy;
        });
      }

      track("support_chat_message_sent");
    } catch {
      setError(t("supportChatError"));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, conversationId, language, shareContext, holdings, quotes, activePortfolioCurrency, user?.plan, track, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  const greeting = welcomeMessage || t("supportChatWelcome");

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-chat-title"
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "min(520px, calc(100vh - 8rem))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-emerald-600 dark:bg-emerald-700 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h2 id="support-chat-title" className="text-sm font-semibold">{t("supportChatTitle")}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 space-y-3 min-h-[200px]"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
              {greeting}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user" ? "whitespace-pre-wrap" : ""
                } ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <AiMarkdown text={msg.content} />
                  ) : (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-1.5">
            <p className="text-xs text-red-500" role="alert">{error}</p>
          </div>
        )}

        {/* Context toggle */}
        <div className="px-4 py-1.5 border-t border-gray-100 dark:border-slate-700/50">
          <label className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={shareContext}
              onChange={(e) => setShareContext(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            {t("supportChatShareContext")}
          </label>
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("supportChatPlaceholder")}
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
              style={{ maxHeight: "80px" }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="shrink-0 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors"
              aria-label={t("supportChatSend")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Escalate */}
        <div className="px-4 pb-3 text-center">
          <button
            onClick={() => {
              track("support_chat_escalated");
              onEscalate();
            }}
            className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline"
          >
            {t("supportChatEscalate")}
          </button>
        </div>
      </div>
    </div>
  );
}
