"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import {
  downsampleChartSamples,
  computeInvestedDeltas,
  type ChartSampleRow,
} from "@/lib/chart-chat-context";
import AiMarkdown from "@/components/AiMarkdown";

type EvolutionRange = "1d" | "1w" | "1m" | "3m" | "6m" | "ytd" | "1y" | "all";
type ChartMode = "value" | "performance";

interface SnapshotPoint {
  date: string;
  value: number;
  invested: number;
}

interface PerfPoint {
  date: string;
  pct: number;
}

interface EventMarker {
  id?: string;
  date: string;
  type: string;
  ticker: string;
  name: string;
  shares: number;
  totalAmount?: number;
  currency?: string;
}

export interface ChartAiChatPanelProps {
  layoutTheme: "default" | "terminal" | "canvas" | "studio";
  range: EvolutionRange;
  chartMode: ChartMode;
  baseCurrency: string;
  portfolioId: string | null;
  points: SnapshotPoint[];
  perfPoints: PerfPoint[];
  events: EventMarker[];
  periodReturnPct: number | null;
  demoMode: boolean;
  stealthMode: boolean;
}

export default function ChartAiChatPanel({
  layoutTheme,
  range,
  chartMode,
  baseCurrency,
  portfolioId,
  points,
  perfPoints,
  events,
  periodReturnPct,
  demoMode,
  stealthMode,
}: ChartAiChatPanelProps) {
  const { t, language } = useI18n();
  const track = useTrack();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [lastTokens, setLastTokens] = useState<number | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Keep the transcript pinned to the bottom without scrolling the page (scrollIntoView was moving the whole viewport on each token). */
  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const buildContext = useCallback(() => {
    const sampled = downsampleChartSamples(points, 80);
    const samples: ChartSampleRow[] = sampled.map((p) => {
      const idx = points.findIndex((x) => x.date === p.date);
      const perf = idx >= 0 ? perfPoints[idx] : undefined;
      return {
        date: p.date,
        value: p.value,
        invested: p.invested,
        ...(chartMode === "performance" && perf ? { performancePct: perf.pct } : {}),
      };
    });

    const investedDeltas = computeInvestedDeltas(points, 24);

    return {
      range,
      chartMode,
      baseCurrency,
      ...(portfolioId ? { portfolioId } : {}),
      displayNoteInterpolated: true,
      samples,
      events: events.slice(0, 120).map((e) => ({
        id: e.id,
        date: e.date,
        type: e.type,
        ticker: e.ticker,
        shares: e.shares,
        totalAmount: e.totalAmount,
        currency: e.currency,
      })),
      stats: {
        firstDate: points[0]?.date ?? "",
        lastDate: points[points.length - 1]?.date ?? "",
        startValue: points[0]?.value ?? 0,
        endValue: points[points.length - 1]?.value ?? 0,
        startInvested: points[0]?.invested ?? 0,
        endInvested: points[points.length - 1]?.invested ?? 0,
        periodReturnPct: periodReturnPct ?? undefined,
        investedDeltas,
      },
    };
  }, [
    points,
    perfPoints,
    events,
    range,
    chartMode,
    baseCurrency,
    portfolioId,
    periodReturnPct,
  ]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || points.length < 2) return;

    setInput("");
    setError("");
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setStreaming(true);

    try {
      const res = await fetch("/api/portfolio/chart-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          language,
          context: buildContext(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.reason === "rate_limited") {
          setError(t("chartChatRateLimit"));
        } else if (res.status === 403) {
          setError(data.error || t("chartChatForbidden"));
        } else {
          setError(data.error || t("chartChatError"));
        }
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError(t("chartChatError"));
        setStreaming(false);
        return;
      }

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
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: display };
          return copy;
        });
      }

      const tokenMatch = accumulated.match(/\[TOKENS:(\d+)\]$/);
      if (tokenMatch) setLastTokens(parseInt(tokenMatch[1], 10));

      track("chart_chat_message_sent", { range, chartMode: String(chartMode) });
    } catch {
      setError(t("chartChatError"));
    } finally {
      setStreaming(false);
    }
  }, [
    input,
    streaming,
    messages,
    language,
    buildContext,
    points.length,
    range,
    chartMode,
    track,
    t,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (demoMode || stealthMode || points.length < 2) {
    return null;
  }

  const chipClass =
    layoutTheme === "terminal"
      ? "text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-green-400 hover:border-green-800"
      : layoutTheme === "canvas"
        ? "text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
        : layoutTheme === "studio"
          ? "text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/40 hover:bg-white/5"
          : "text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800";

  const panelClass =
    layoutTheme === "terminal"
      ? "border border-zinc-800 rounded-lg bg-zinc-950/80"
      : layoutTheme === "canvas"
        ? "border border-slate-200 rounded-xl bg-slate-50/80"
        : layoutTheme === "studio"
          ? "border border-white/[0.08] rounded-xl bg-slate-950/50"
          : "border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/80 dark:bg-slate-900/40";

  const headerBtnClass =
    layoutTheme === "terminal"
      ? "text-[10px] font-mono text-zinc-500 hover:text-green-400 flex items-center gap-1.5"
      : layoutTheme === "canvas"
        ? "text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        : layoutTheme === "studio"
          ? "text-xs text-white/50 hover:text-white/80 flex items-center gap-1.5"
          : "text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5";

  return (
    <div className="mt-3 space-y-2" data-testid="chart-ai-chat">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={headerBtnClass}
        aria-expanded={open}
        aria-controls="chart-ai-chat-panel"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        {open ? t("chartChatHide") : t("chartChatAsk")}
      </button>

      {open && (
        <div id="chart-ai-chat-panel" className={`${panelClass} p-3 space-y-2`} role="region" aria-label={t("chartChatTitle")}>
          <p className={`text-[10px] leading-relaxed ${layoutTheme === "studio" ? "text-white/35" : "text-gray-500 dark:text-slate-500"}`}>
            {t("chartChatDisclaimer")}
          </p>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chipClass} onClick={() => setInput(t("chartChatSuggestionInvested"))}>
              {t("chartChatSuggestionInvested")}
            </button>
            <button type="button" className={chipClass} onClick={() => setInput(t("chartChatSuggestionMove"))}>
              {t("chartChatSuggestionMove")}
            </button>
          </div>

          <div
            ref={messagesScrollRef}
            className={`max-h-48 overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 text-sm ${layoutTheme === "studio" ? "text-white/80" : "text-gray-800 dark:text-slate-200"}`}
            aria-live="polite"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-lg px-2.5 py-1.5 text-xs ${
                    msg.role === "user" ? "whitespace-pre-wrap" : ""
                  } ${
                    msg.role === "user"
                      ? layoutTheme === "terminal"
                        ? "bg-green-950 text-green-200"
                        : "bg-emerald-600 text-white"
                      : layoutTheme === "terminal"
                        ? "bg-zinc-900 text-zinc-300"
                        : layoutTheme === "studio"
                          ? "bg-slate-800 text-slate-200"
                          : "bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-100 dark:border-slate-700"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <AiMarkdown text={msg.content} compact />
                    ) : (
                      <span className="inline-flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                      </span>
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {lastTokens !== null && !streaming && messages.length > 0 && (
              <div className="text-center pt-1">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 tabular-nums">
                  {t("aiResponseTokens").replace("{tokens}", lastTokens.toLocaleString())}
                </span>
              </div>
            )}
          </div>

          {error ? (
            <p className="text-xs text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-end gap-2 pt-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chartChatPlaceholder")}
              aria-label={t("chartChatPlaceholder")}
              rows={2}
              disabled={streaming}
              className={`flex-1 resize-none text-xs rounded-lg border px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${
                layoutTheme === "terminal"
                  ? "bg-zinc-900 border-zinc-700 text-zinc-200"
                  : layoutTheme === "studio"
                    ? "bg-slate-900 border-slate-700 text-white placeholder:text-white/30"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600"
              }`}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={streaming || !input.trim()}
              className="shrink-0 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 text-xs"
              aria-label={t("chartChatSend")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
