"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import AiMarkdown from "@/components/AiMarkdown";
import WarrenAvatar from "./WarrenAvatar";
import RenderPart from "./RenderPart";
import ActionCard from "./ActionCard";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import {
  calculatePortfolioTotals,
  computeAllocationByType,
} from "@/lib/portfolio-summary";
import { convertToEUR, resolveQuoteCurrency, formatCurrency } from "@/lib/utils";
import type {
  WarrenPart,
  WarrenProposal,
  WarrenStreamFrame,
} from "@/lib/ai/warren/types";

type Bubble =
  | { id: string; kind: "text-user"; content: string }
  | { id: string; kind: "text-assistant"; content: string }
  | { id: string; kind: "tool-step"; label: string }
  | { id: string; kind: "part"; part: WarrenPart }
  | { id: string; kind: "proposal"; proposal: WarrenProposal };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

function buildSnapshot(args: {
  holdings: ReturnType<typeof usePortfolio>["holdings"];
  cashEntries: ReturnType<typeof usePortfolio>["cashEntries"];
  quotes: ReturnType<typeof usePortfolio>["quotes"];
  exchangeRates: ReturnType<typeof usePortfolio>["exchangeRates"];
  baseCurrency: string;
}) {
  const { holdings, cashEntries, quotes, exchangeRates, baseCurrency } = args;
  const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const allocation = computeAllocationByType(
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    baseCurrency,
  );
  const topHoldings = holdings
    .map((h) => {
      const q = quotes[h.ticker];
      const price = q?.regularMarketPrice ?? h.purchasePrice;
      const localValue = price * h.shares;
      const quoteCur = q ? resolveQuoteCurrency(h.displayCurrency, q.currency) : h.displayCurrency;
      const valueEUR = convertToEUR(localValue, quoteCur, exchangeRates);
      const cost = h.purchasePrice * h.shares;
      const totalGainPct = cost > 0 ? ((localValue - cost) / cost) * 100 : 0;
      return {
        ticker: h.ticker,
        name: h.name || h.ticker,
        shares: h.shares,
        currentPrice: q?.regularMarketPrice,
        purchasePrice: h.purchasePrice,
        currency: q?.currency || h.displayCurrency,
        value: Math.round(valueEUR * 100) / 100,
        weight:
          totals.totalCurrentEUR > 0
            ? Math.round((valueEUR / totals.totalCurrentEUR) * 10000) / 100
            : 0,
        sector: h.sector || undefined,
        region: h.region || undefined,
        assetType: h.assetType || "stock",
        dayChangePct: q?.regularMarketChangePercent,
        totalGainPct: Math.round(totalGainPct * 100) / 100,
        fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: q?.fiftyTwoWeekLow,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
  const cashSummary = cashEntries.reduce(
    (acc, c) => {
      const key = c.displayCurrency || "EUR";
      acc[key] = (acc[key] || 0) + c.amountEUR;
      return acc;
    },
    {} as Record<string, number>,
  );
  return {
    baseCurrency,
    totals: {
      value: Math.round(totals.totalCurrentEUR * 100) / 100,
      cost: Math.round(totals.totalCostEUR * 100) / 100,
      gainLoss: Math.round(totals.totalGainLoss * 100) / 100,
      gainLossPct: Math.round(totals.totalGainLossPercent * 100) / 100,
      dayChange: Math.round(totals.dayGainLossEUR * 100) / 100,
    },
    holdingsCount: holdings.length,
    topHoldings,
    allocation: allocation.map((a) => ({ type: a.label, pct: Math.round(a.percent * 10) / 10 })),
    cashSummary,
  };
}

export default function WarrenDrawer({ isOpen, onClose }: Props) {
  const { t, language } = useI18n();
  const {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioId,
    activePortfolioCurrency,
    demoMode,
    refreshHoldings,
    refreshAlertedTickers,
  } = usePortfolio();
  const { stealthMode } = useStealthMode();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency],
  );

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles.length]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userBubble: Bubble = { id: makeId(), kind: "text-user", content: text.trim() };
      const assistantId = makeId();
      const assistantBubble: Bubble = {
        id: assistantId,
        kind: "text-assistant",
        content: "",
      };
      setBubbles((prev) => [...prev, userBubble, assistantBubble]);
      setInput("");
      setStreaming(true);

      const snapshot = stealthMode
        ? undefined
        : buildSnapshot({
            holdings,
            cashEntries,
            quotes,
            exchangeRates,
            baseCurrency: activePortfolioCurrency,
          });

      const messages = [...bubbles, userBubble]
        .filter(
          (b): b is Bubble & { kind: "text-user" | "text-assistant" } =>
            b.kind === "text-user" || b.kind === "text-assistant",
        )
        .map((b) => ({
          role: b.kind === "text-user" ? "user" : ("assistant" as const),
          content: b.content,
        }))
        .filter((m) => m.content.length > 0);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/warren/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            messages,
            language,
            activePortfolioId: activePortfolioId ?? undefined,
            baseCurrency: activePortfolioCurrency,
            isDemo: !!demoMode,
            portfolioContext: snapshot,
          }),
        });

        if (!res.ok || !res.body) {
          let err = "AI request failed";
          try {
            const j = await res.json();
            err = j.error || err;
          } catch {
            // ignore
          }
          appendError(setBubbles, assistantId, err);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const frame = JSON.parse(line) as WarrenStreamFrame;
              applyFrame(setBubbles, assistantId, frame);
            } catch {
              // ignore malformed line
            }
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        appendError(
          setBubbles,
          assistantId,
          err instanceof Error ? err.message : "Connection error",
        );
      } finally {
        setStreaming(false);
      }
    },
    [
      streaming,
      bubbles,
      stealthMode,
      holdings,
      cashEntries,
      quotes,
      exchangeRates,
      language,
      activePortfolioId,
      activePortfolioCurrency,
      demoMode,
    ],
  );

  const onProposalConfirmed = useCallback(() => {
    refreshHoldings?.();
    refreshAlertedTickers?.();
  }, [refreshHoldings, refreshAlertedTickers]);

  const quickPrompts = [
    t("warrenChipSummary"),
    t("warrenChipConcentration"),
    t("warrenChipDividends"),
    t("warrenChipAlertExample"),
  ];

  const contextLine = stealthMode
    ? t("warrenConnected")
    : `${t("warrenConnected")} — ${holdings.length} ${t("warrenHoldingsLabel")}, ${formatCurrency(
        totals.totalCurrentEUR,
        activePortfolioCurrency,
      )}`;

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm transition-opacity duration-250 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={`fixed top-0 right-0 z-[101] w-[460px] max-w-[calc(100vw-1rem)] h-full flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } bg-gradient-to-b from-[#15110e] to-[#0e0b09] text-amber-50 border-l border-amber-500/15`}
        role="dialog"
        aria-label="Warren"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/10 bg-gradient-to-r from-amber-500/[0.05] to-transparent shrink-0">
          <WarrenAvatar size={42} thinking={streaming} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] leading-tight tracking-tight">{t("warrenName")}</div>
            <div className="text-[11px] text-amber-300/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t("warrenSubtitle")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-amber-500/15 bg-white/[0.04] flex items-center justify-center text-amber-200/60 hover:text-amber-200 hover:border-amber-400/40 transition-colors"
            aria-label={t("warrenClose")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-amber-300/60 border-b border-amber-500/[0.08] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {contextLine}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {bubbles.length === 0 && (
            <div className="flex gap-2 items-start">
              <WarrenAvatar size={28} />
              <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.04] border border-amber-500/10 text-amber-50 max-w-[82%]">
                {t("warrenGreeting")}
              </div>
            </div>
          )}

          {bubbles.map((b) => {
            if (b.kind === "text-user") {
              return (
                <div key={b.id} className="flex justify-end">
                  <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-amber-400 to-[#b58457] text-amber-950 max-w-[82%] whitespace-pre-wrap font-medium">
                    {b.content}
                  </div>
                </div>
              );
            }
            if (b.kind === "tool-step") {
              return (
                <div key={b.id} className="flex items-center gap-2 pl-9 text-[12px] italic text-amber-300/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {b.label}
                </div>
              );
            }
            if (b.kind === "part") {
              return (
                <div key={b.id} className="pl-9">
                  <RenderPart part={b.part} />
                </div>
              );
            }
            if (b.kind === "proposal") {
              return <ActionCard key={b.id} proposal={b.proposal} onConfirmed={onProposalConfirmed} />;
            }
            return (
              <div key={b.id} className="flex gap-2 items-start">
                <WarrenAvatar size={28} />
                <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.04] border border-amber-500/10 text-amber-50 max-w-[82%]">
                  {b.content ? (
                    <AiMarkdown text={b.content} compact />
                  ) : streaming ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={streamEndRef} />
        </div>

        {!streaming && bubbles.length === 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 shrink-0">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs font-medium text-amber-200 bg-amber-500/[0.08] border border-amber-500/20 rounded-full px-3 py-1.5 hover:bg-amber-500/[0.16] hover:border-amber-400/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-3 pb-4 border-t border-amber-500/10 bg-amber-500/[0.02] shrink-0">
          <div className="flex gap-2 items-end bg-white/[0.04] border border-amber-500/15 rounded-2xl px-3 py-2 focus-within:border-amber-400/40">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={t("warrenPlaceholder")}
              className="flex-1 text-[13.5px] bg-transparent border-0 outline-none text-amber-50 placeholder:text-amber-200/30 resize-none max-h-[110px]"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-lg bg-amber-500 text-amber-950 flex items-center justify-center disabled:opacity-30 hover:bg-amber-400 transition-colors"
              aria-label={t("warrenSend")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p className="text-[10.5px] text-center text-amber-200/50 mt-2 px-2">{t("warrenDisclaimer")}</p>
        </div>
      </aside>
    </>
  );
}

function applyFrame(
  setBubbles: React.Dispatch<React.SetStateAction<Bubble[]>>,
  assistantId: string,
  frame: WarrenStreamFrame,
) {
  if (frame.kind === "text") {
    setBubbles((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((b) => b.id === assistantId);
      if (idx >= 0 && updated[idx].kind === "text-assistant") {
        updated[idx] = {
          ...updated[idx],
          content: (updated[idx] as { content: string }).content + frame.delta,
        };
      }
      return updated;
    });
  } else if (frame.kind === "tool_step") {
    setBubbles((prev) => insertBefore(prev, assistantId, { id: makeId(), kind: "tool-step", label: frame.label }));
  } else if (frame.kind === "part") {
    setBubbles((prev) => insertBefore(prev, assistantId, { id: makeId(), kind: "part", part: frame.part }));
  } else if (frame.kind === "proposal") {
    setBubbles((prev) => insertBefore(prev, assistantId, { id: makeId(), kind: "proposal", proposal: frame.proposal }));
  } else if (frame.kind === "error") {
    setBubbles((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((b) => b.id === assistantId);
      const errorMsg = `⚠️ ${frame.message}`;
      if (idx >= 0 && updated[idx].kind === "text-assistant") {
        updated[idx] = { ...updated[idx], content: errorMsg };
      }
      return updated;
    });
  }
}

function insertBefore(prev: Bubble[], anchorId: string, bubble: Bubble): Bubble[] {
  const idx = prev.findIndex((b) => b.id === anchorId);
  if (idx < 0) return [...prev, bubble];
  const next = [...prev];
  next.splice(idx, 0, bubble);
  return next;
}

function appendError(
  setBubbles: React.Dispatch<React.SetStateAction<Bubble[]>>,
  assistantId: string,
  message: string,
) {
  setBubbles((prev) => {
    const updated = [...prev];
    const idx = updated.findIndex((b) => b.id === assistantId);
    const errorContent = `⚠️ ${message}`;
    if (idx >= 0 && updated[idx].kind === "text-assistant") {
      updated[idx] = { ...updated[idx], content: errorContent };
    }
    return updated;
  });
}
