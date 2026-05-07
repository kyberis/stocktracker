"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useStealthMode } from "@/lib/stealth-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency } from "@/lib/utils";
import AiMarkdown from "@/components/AiMarkdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  autoAnalyze?: boolean;
}

export default function PortfolioAiDrawer({ isOpen, onClose, autoAnalyze }: Props) {
  const { t, language } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency, activePortfolioId, demoMode } =
    usePortfolio();
  const { user, refreshUser } = useAuth();
  const { stealthMode } = useStealthMode();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastTokens, setLastTokens] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  const autoAnalyzeFiredRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || demoMode) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      try {
        const res = await fetch("/api/portfolio/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            language,
            includePortfolioData: !stealthMode,
            activePortfolioId: activePortfolioId ?? undefined,
            baseCurrency: activePortfolioCurrency,
          }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) => [...prev, { role: "assistant", content: t("aiErrorGeneric") }]);
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        setLastTokens(null);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const display = accumulated.replace(/\n\[TOKENS:\d+\]$/, "");
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: display };
            return updated;
          });
        }

        const tokenMatch = accumulated.match(/\[TOKENS:(\d+)\]$/);
        if (tokenMatch) {
          setLastTokens(parseInt(tokenMatch[1], 10));
          refreshUser();
        }
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: t("aiErrorConnection") }]);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, demoMode, stealthMode, activePortfolioId, activePortfolioCurrency, language, t, refreshUser],
  );

  useEffect(() => {
    if (isOpen && autoAnalyze && messages.length === 0 && !autoAnalyzeFiredRef.current && holdings.length > 0) {
      autoAnalyzeFiredRef.current = true;
      sendMessage(t("v2AiAutoAnalyzePrompt"));
    }
  }, [isOpen, autoAnalyze, messages.length, holdings.length, sendMessage, t]);

  const suggestions = [
    { label: t("v2AiChipBest"), q: t("aiQBest") },
    { label: t("v2AiChipConcentrated"), q: t("aiQConcentrated") },
    { label: t("v2AiChipDividends"), q: t("aiQDividends") },
    { label: t("v2AiChipEarnings"), q: t("aiQEarnings") },
    { label: t("v2AiChipSP500"), q: t("aiQSP500") },
    { label: t("v2AiChipRisk"), q: t("aiQRisk") },
  ];

  const contextLine = stealthMode
    ? t("v2AiConnected")
    : `${t("v2AiConnected")} — ${holdings.length} holdings, ${formatCurrency(totals.totalCurrentEUR, activePortfolioCurrency)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[101] w-[440px] max-w-[calc(100vw-2rem)] h-full flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } bg-white dark:bg-[#151e2f] border-l border-violet-500/20`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-violet-500/10 bg-gradient-to-r from-violet-500/[0.04] to-transparent shrink-0">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shrink-0">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-violet-700 dark:text-violet-200">{t("v2PortfolioAi")}</p>
            <p className="text-[11px] text-gray-500 dark:text-slate-500">{t("v2AskAnything")}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Context bar */}
        <div className="flex items-center gap-1.5 px-5 py-2 text-[11px] text-violet-600/60 dark:text-violet-400/50 border-b border-gray-100 dark:border-white/[0.04] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
          {contextLine}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Welcome message */}
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-500 dark:text-violet-300 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-violet-500/[0.06] text-violet-800 dark:text-violet-200 max-w-[82%]">
              {t("v2AiWelcome")}
            </div>
          </div>

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-violet-500/15 text-violet-500 dark:text-violet-300"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {msg.role === "assistant" ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                  </svg>
                )}
              </div>
              <div
                className={`text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl max-w-[82%] ${
                  msg.role === "assistant"
                    ? "rounded-bl-sm bg-violet-500/[0.06] text-violet-800 dark:text-violet-200"
                    : "rounded-br-sm bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-100 whitespace-pre-wrap"
                }`}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <AiMarkdown text={msg.content} compact />
                  ) : streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </span>
                  ) : ""
                ) : msg.content}
              </div>
            </div>
          ))}
          {lastTokens !== null && !streaming && messages.length > 0 && (
            <div className="text-center py-1">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 tabular-nums">
                {t("aiResponseTokens").replace("{tokens}", lastTokens.toLocaleString())}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {!streaming && (() => {
          const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content));
          const remaining = suggestions.filter((s) => !asked.has(s.q));
          if (remaining.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 px-5 pb-3 shrink-0">
              {remaining.map((s) => (
                <button
                  key={s.q}
                  onClick={() => sendMessage(s.q)}
                  className="text-xs font-medium text-violet-600 dark:text-violet-300 bg-violet-500/[0.05] border border-violet-500/15 rounded-full px-3.5 py-1.5 hover:bg-violet-500/10 hover:border-violet-500/25 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Input */}
        <div className="px-5 pt-3 pb-4 border-t border-violet-500/10 bg-violet-500/[0.02] shrink-0">
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={t("v2AiPlaceholder")}
              className="flex-1 text-[13px] bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-violet-500/15 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-violet-400/30 outline-none focus:border-violet-500/40 transition-colors"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center shrink-0 disabled:opacity-30 hover:opacity-85 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-gray-400/60 dark:text-gray-400/40 px-5 pb-3">
          {t("v2AiDisclaimer")}
        </p>
      </div>
    </>
  );
}
