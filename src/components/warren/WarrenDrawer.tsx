"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import AiMarkdown from "@/components/AiMarkdown";
import WarrenAvatar from "./WarrenAvatar";
import RenderPart from "./RenderPart";
import ActionCard from "./ActionCard";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { usePlatform } from "@/lib/platform-context";
import { useStealthMode } from "@/lib/stealth-context";
import { resolveIdpUpgradeHref } from "@/lib/idp/config";
import {
  calculatePortfolioTotals,
  computeAllocationByType,
} from "@/lib/portfolio-summary";
import { formatCurrency } from "@/lib/utils";
import type {
  WarrenPart,
  WarrenProposal,
  WarrenStreamFrame,
} from "@/lib/ai/warren/types";
import { buildTopHoldingRow } from "@/lib/ai/warren/snapshot-shared";
import {
  WARREN_MAX_COMBINED_ATTACHMENT_BYTES,
  WARREN_MAX_FILES_PER_MESSAGE,
} from "@/lib/ai/warren/upload-limits";
import {
  normalizeWarrenTextMessages,
  type WarrenTextRow,
} from "@/lib/ai/warren/normalize-chat-messages";
import { Paperclip } from "lucide-react";
import type { HoldingsExplorerSelection } from "@/lib/holdings-research";

type Bubble =
  | { id: string; kind: "text-user"; content: string }
  | { id: string; kind: "text-assistant"; content: string }
  | { id: string; kind: "tool-step"; label: string }
  | { id: string; kind: "part"; part: WarrenPart }
  | { id: string; kind: "proposal"; proposal: WarrenProposal };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Inline panel for AID — no overlay drawer */
  embedded?: boolean;
  /** Optional height/layout override when `embedded` (e.g. AID sticky column). */
  embeddedClassName?: string;
  /** `floating` = compact popover (Holdings Explorer). Overrides `embedded` when set. */
  placement?: "drawer" | "embedded" | "floating";
  suggestionPrompts?: string[];
  onSuggestionClick?: (prompt: string) => void;
  /** When set, sends this prompt once (AID Warren nudge). */
  triggerPrompt?: string | null;
  onTriggerPromptConsumed?: () => void;
  /** Structured Holdings Explorer cell — sent with each message, not in user text. */
  selectionContext?: HoldingsExplorerSelection | null;
  selectionChipText?: string | null;
  onClearSelection?: () => void;
  emptyGreeting?: string;
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
  // Per-holding rows must use the SAME shape and unit normalisation as the
  // server-side snapshot; otherwise Warren's web replies disagree with its
  // Telegram replies (and with the dashboard).
  const topHoldings = holdings
    .map((h) => buildTopHoldingRow(h, quotes, exchangeRates, totals.totalCurrentEUR))
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

export default function WarrenDrawer({
  isOpen,
  onClose,
  embedded = false,
  embeddedClassName,
  placement,
  suggestionPrompts,
  onSuggestionClick,
  triggerPrompt,
  onTriggerPromptConsumed,
  selectionContext,
  selectionChipText,
  onClearSelection,
  emptyGreeting,
}: Props) {
  const mode = placement ?? (embedded ? "embedded" : "drawer");
  const { t, language } = useI18n();
  const { userPlan } = usePlatform();
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const trimmed = text.trim();
      const files = pendingFiles;
      if ((!trimmed && files.length === 0) || streaming) return;

      const userDisplay =
        trimmed + (files.length > 0 ? `${trimmed ? "\n\n" : ""}📎 ${files.map((f) => f.name).join(", ")}` : "");

      const userBubble: Bubble = { id: makeId(), kind: "text-user", content: userDisplay || "📎" };
      const assistantId = makeId();
      const assistantBubble: Bubble = {
        id: assistantId,
        kind: "text-assistant",
        content: "",
      };
      setBubbles((prev) => [...prev, userBubble, assistantBubble]);
      setInput("");
      setPendingFiles([]);
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

      const textRows = bubbles
        .filter(
          (b): b is Bubble & { kind: "text-user" | "text-assistant" } =>
            b.kind === "text-user" || b.kind === "text-assistant",
        )
        .map(
          (b): WarrenTextRow => ({
            role: b.kind === "text-user" ? "user" : "assistant",
            content: b.content,
          }),
        );

      const priorForMultipart = normalizeWarrenTextMessages(textRows);
      const messagesForJson = normalizeWarrenTextMessages([
        ...textRows,
        { role: "user" as const, content: trimmed },
      ]);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        let res: Response;
        if (files.length > 0) {
          const fd = new FormData();
          fd.append(
            "payload",
            JSON.stringify({
              messages: priorForMultipart,
              language,
              activePortfolioId: activePortfolioId ?? undefined,
              baseCurrency: activePortfolioCurrency,
              isDemo: !!demoMode,
              portfolioContext: snapshot,
              selectionContext: selectionContext ?? undefined,
            }),
          );
          fd.append("userText", trimmed);
          for (const f of files) fd.append("files", f);
          res = await fetch("/api/warren/chat", {
            method: "POST",
            signal: ac.signal,
            body: fd,
          });
        } else {
          res = await fetch("/api/warren/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ac.signal,
            body: JSON.stringify({
              messages: messagesForJson,
              language,
              activePortfolioId: activePortfolioId ?? undefined,
              baseCurrency: activePortfolioCurrency,
              isDemo: !!demoMode,
              portfolioContext: snapshot,
              selectionContext: selectionContext ?? undefined,
            }),
          });
        }

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
      pendingFiles,
      stealthMode,
      holdings,
      cashEntries,
      quotes,
      exchangeRates,
      language,
      activePortfolioId,
      activePortfolioCurrency,
      demoMode,
      selectionContext,
    ],
  );

  const lastTriggerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!triggerPrompt?.trim() || streaming) return;
    if (lastTriggerRef.current === triggerPrompt) return;
    lastTriggerRef.current = triggerPrompt;
    onTriggerPromptConsumed?.();
    setPendingFiles([]);
    void sendMessage(triggerPrompt);
  }, [triggerPrompt, streaming, sendMessage, onTriggerPromptConsumed]);

  const onProposalConfirmed = useCallback(() => {
    refreshHoldings?.();
    refreshAlertedTickers?.();
  }, [refreshHoldings, refreshAlertedTickers]);

  const quickPrompts = suggestionPrompts ?? (
    holdings.length === 0
      ? [
          t("warrenChipAddExample1"),
          t("warrenChipAddExample2"),
          t("warrenChipAddExample3"),
        ]
      : [
          t("warrenChipSummary"),
          t("warrenChipConcentration"),
          t("warrenChipDividends"),
          t("warrenChipAlertExample"),
        ]
  );

  const greeting =
    emptyGreeting ||
    (holdings.length === 0 ? t("warrenGreetingEmptyAdd") || t("warrenGreeting") : t("warrenGreeting"));

  const contextLine = stealthMode
    ? t("warrenConnected")
    : holdings.length === 0
      ? t("warrenConnectedEmptyAdd") || t("warrenConnected")
      : `${t("warrenConnected")} — ${holdings.length} ${t("warrenHoldingsLabel")}, ${formatCurrency(
          totals.totalCurrentEUR,
          activePortfolioCurrency,
        )}`;

  const panelClass =
    mode === "embedded"
      ? [
          "flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-[0_16px_32px_rgba(1,6,16,0.28)]",
          embeddedClassName ?? "h-[min(560px,calc(100vh-14rem))]",
        ].join(" ")
      : mode === "floating"
        ? `fixed bottom-20 sm:bottom-6 right-6 z-50 flex w-[min(360px,calc(100vw-1.5rem))] h-[min(480px,70vh)] flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-amber-500/15 bg-white dark:bg-[#151e2f] text-gray-900 dark:text-slate-100 shadow-2xl ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`
        : `fixed top-0 right-0 z-[101] w-[460px] max-w-[calc(100vw-1rem)] h-full flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          } bg-white dark:bg-[#151e2f] text-gray-900 dark:text-slate-100 border-l border-gray-200 dark:border-amber-500/15`;

  const panel = (
      <aside
        className={panelClass}
        role={mode === "embedded" ? "region" : "dialog"}
        aria-label={t("warrenName")}
        aria-hidden={mode === "embedded" ? undefined : !isOpen}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-amber-500/10 bg-gradient-to-r from-amber-500/[0.05] to-transparent shrink-0">
          <WarrenAvatar size={42} thinking={streaming} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] leading-tight tracking-tight text-amber-700 dark:text-amber-200">
              {t("warrenName")}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-amber-300/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t("warrenSubtitle")}
            </div>
          </div>
          {mode !== "embedded" && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-amber-500/15 bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-gray-500 dark:text-amber-200/60 hover:text-amber-700 dark:hover:text-amber-200 hover:border-amber-400/50 transition-colors"
            aria-label={t("warrenClose")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-gray-500 dark:text-amber-300/60 border-b border-gray-100 dark:border-amber-500/[0.08] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {contextLine}
        </div>

        {!demoMode && userPlan !== "pro" && (
          <div className="mx-4 mt-3 mb-1 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-[11px] leading-snug text-gray-800 dark:text-amber-50/95">
            <p className="mb-2">{t("warrenFolioModelBanner")}</p>
            <button
              type="button"
              className="text-xs font-semibold text-amber-800 dark:text-amber-200 underline-offset-2 hover:underline"
              onClick={() => {
                window.location.href = resolveIdpUpgradeHref({ interval: "monthly" });
              }}
            >
              {t("warrenUpgradeCta")}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {bubbles.length === 0 && (
            <div className="flex gap-2 items-start">
              <WarrenAvatar size={28} />
              <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-amber-500/[0.06] border border-amber-500/15 text-gray-800 dark:text-amber-50 max-w-[82%]">
                {greeting}
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
                <div
                  key={b.id}
                  className="flex items-center gap-2 pl-9 text-[12px] italic text-gray-500 dark:text-amber-300/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
                <div className="text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-amber-500/[0.06] border border-amber-500/15 text-gray-800 dark:text-amber-50 max-w-[82%]">
                  {b.content ? (
                    <AiMarkdown text={b.content} compact />
                  ) : streaming ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
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
                onClick={() => {
                  onSuggestionClick?.(q);
                  setPendingFiles([]);
                  void sendMessage(q);
                }}
                className="text-xs font-medium text-amber-700 dark:text-amber-200 bg-amber-500/[0.08] border border-amber-500/25 rounded-full px-3 py-1.5 hover:bg-amber-500/[0.16] hover:border-amber-500/45 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-3 pb-4 border-t border-gray-200 dark:border-amber-500/10 bg-amber-500/[0.02] shrink-0 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf,text/csv,.csv,audio/*"
            onChange={(e) => {
              const list = e.target.files;
              if (!list?.length) return;
              setPendingFiles((prev) => {
                let combined = prev.reduce((s, f) => s + f.size, 0);
                const next = [...prev];
                for (let i = 0; i < list.length; i++) {
                  const f = list.item(i)!;
                  if (next.length >= WARREN_MAX_FILES_PER_MESSAGE) break;
                  combined += f.size;
                  if (combined > WARREN_MAX_COMBINED_ATTACHMENT_BYTES) break;
                  next.push(f);
                }
                return next.slice(0, WARREN_MAX_FILES_PER_MESSAGE);
              });
              e.target.value = "";
            }}
          />
          {selectionChipText ? (
            <div
              data-testid="holdings-explorer-warren-chip"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.1] px-2.5 py-1 text-[11px] font-medium text-amber-900 dark:text-amber-100"
            >
              <span className="truncate">{selectionChipText}</span>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="shrink-0 opacity-70 hover:opacity-100"
                  aria-label={t("holdingsExplorerWarrenChipClear")}
                >
                  ×
                </button>
              )}
            </div>
          ) : null}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {pendingFiles.map((f, idx) => (
                <span
                  key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-900 dark:text-amber-100 max-w-full truncate"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-amber-500/15 rounded-2xl px-3 py-2 focus-within:border-amber-400/50">
            <button
              type="button"
              className="mb-0.5 p-2 rounded-lg text-gray-500 dark:text-amber-200/60 hover:bg-black/5 dark:hover:bg-white/[0.06] shrink-0"
              aria-label={t("warrenAttachAria")}
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder={t("warrenPlaceholder")}
              className="flex-1 text-[13.5px] bg-transparent border-0 outline-none text-gray-900 dark:text-amber-50 placeholder:text-gray-400 dark:placeholder:text-amber-200/30 resize-none max-h-[110px]"
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={(!input.trim() && pendingFiles.length === 0) || streaming}
              className="w-9 h-9 rounded-lg bg-amber-500 text-amber-950 flex items-center justify-center disabled:opacity-30 hover:bg-amber-400 transition-colors"
              aria-label={t("warrenSend")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p className="text-[10.5px] text-center text-gray-400 dark:text-amber-200/50 mt-2 px-2">
            {t("warrenDisclaimer")}
          </p>
        </div>
      </aside>
  );

  if (mode === "embedded") return panel;
  if (mode === "floating") {
    if (!isOpen) return null;
    return panel;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm transition-opacity duration-250 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      {panel}
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
