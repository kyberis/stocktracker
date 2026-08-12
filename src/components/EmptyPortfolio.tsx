"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import WarrenAvatar from "@/components/warren/WarrenAvatar";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";

const EMPTY_ACTIVATION_KEY = "empty_activation";

type EmptyVariant = "control" | "portfolio_first" | "job_chooser";

function asVariant(raw: string): EmptyVariant {
  if (raw === "portfolio_first" || raw === "job_chooser") return raw;
  return "control";
}

/** Classic empty portfolio CTA — shared by Dashboard and Home v2. */
export default function EmptyPortfolio({
  onAddStock,
  onAskWarren,
  demoMode = false,
}: {
  onAddStock: () => void;
  onAskWarren?: (prompt: string) => void;
  demoMode?: boolean;
}) {
  const { t } = useI18n();
  const [chatInput, setChatInput] = useState("");
  const experiment = useExperiment(EMPTY_ACTIVATION_KEY, {
    enabled: !demoMode,
    forceVariant: demoMode ? "control" : undefined,
  });
  const variant = asVariant(experiment.variant);

  const trackCta = (cta: string) => {
    if (demoMode) return;
    void trackExperimentEvent("empty_activation_cta", {
      experiment: EMPTY_ACTIVATION_KEY,
      variant,
      cta,
    });
  };

  const submitChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !onAskWarren) return;
    trackCta("warren");
    onAskWarren(trimmed);
    setChatInput("");
  };

  const warrenBlock = onAskWarren ? (
    <div className="card border-amber-500/16 bg-amber-500/[0.06] p-3 sm:p-4" data-testid="empty-warren-chat">
      <div className="flex items-center gap-2 mb-1">
        <WarrenAvatar size={28} />
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {t("emptyStateWarrenChatTitle") || "Or just tell Warren"}
        </p>
      </div>
      <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mb-2 leading-snug">
        {t("emptyStateWarrenChatHint") ||
          "Warren can only help add stocks here — up to 10 messages, then a 15-minute break."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitChat();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={
            t("emptyStateWarrenChatPlaceholder") ||
            'Try: "I bought 10 AAPL at $150 on 2024-01-15"'
          }
          className="flex-1 min-h-[44px] px-3 py-2 text-sm rounded-lg border border-amber-500/20 bg-white dark:bg-slate-800/60 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          aria-label={t("warrenSend")}
          className="shrink-0 w-11 h-11 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.874L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  ) : null;

  const hero = (
    <div className="text-center py-6">
      <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("emptyStateTitle")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">{t("emptyStateSubtitle")}</p>
    </div>
  );

  const importCard = (
    <a
      href="/import"
      onClick={() => trackCta("import")}
      className="group card p-5 flex flex-col items-center text-center hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all hover:shadow-md"
      data-testid="empty-cta-import"
    >
      <div className="w-12 h-12 mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("emptyStateImport")}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateImportDesc")}</p>
    </a>
  );

  const addCard = (
    <button
      type="button"
      onClick={() => {
        trackCta("add");
        onAddStock();
      }}
      className="group card p-5 flex flex-col items-center text-center hover:border-violet-400 dark:hover:border-violet-500/40 transition-all hover:shadow-md"
      data-testid="empty-cta-add"
    >
      <div className="w-12 h-12 mb-3 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
        <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("addStock")}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateAddDesc")}</p>
    </button>
  );

  if (variant === "job_chooser") {
    return (
      <div className="space-y-6" data-testid="empty-activation" data-variant="job_chooser">
        {hero}
        <p className="text-center text-sm font-medium text-gray-700 dark:text-slate-300">
          {t("emptyStateJobChooserLead")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addCard}
          {importCard}
          <a
            href="/moat"
            onClick={() => trackCta("moat")}
            className="group card p-5 flex flex-col items-center text-center hover:border-sky-400 dark:hover:border-sky-500/40 transition-all hover:shadow-md"
            data-testid="empty-cta-moat"
          >
            <div className="w-12 h-12 mb-3 rounded-2xl bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364 1.386l-1.591 1.591M21 12h-2.25m-1.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {t("emptyStateJobMoat")}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t("emptyStateJobMoatDesc")}
            </p>
          </a>
          <a
            href="/screener"
            onClick={() => trackCta("screener")}
            className="group card p-5 flex flex-col items-center text-center hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all hover:shadow-md"
            data-testid="empty-cta-screener"
          >
            <div className="w-12 h-12 mb-3 rounded-2xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {t("emptyStateJobScreener")}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t("emptyStateJobScreenerDesc")}
            </p>
          </a>
        </div>
        {warrenBlock}
      </div>
    );
  }

  if (variant === "portfolio_first") {
    return (
      <div className="space-y-6" data-testid="empty-activation" data-variant="portfolio_first">
        {hero}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {importCard}
          {addCard}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 text-center">
            {t("emptyStateMeanwhileExplore")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="/moat"
              onClick={() => trackCta("moat")}
              className="btn-secondary text-xs"
              data-testid="empty-cta-moat"
            >
              {t("emptyStateJobMoat")}
            </a>
            <a
              href="/screener"
              onClick={() => trackCta("screener")}
              className="btn-secondary text-xs"
              data-testid="empty-cta-screener"
            >
              {t("emptyStateJobScreener")}
            </a>
            {onAskWarren && (
              <button
                type="button"
                className="btn-secondary text-xs"
                data-testid="empty-cta-warren-chip"
                onClick={() => {
                  trackCta("warren_chip");
                  document
                    .querySelector<HTMLInputElement>("[data-testid='empty-warren-chat'] input")
                    ?.focus();
                }}
              >
                {t("emptyStateWarrenChatTitle")}
              </button>
            )}
          </div>
        </div>
        {warrenBlock}
      </div>
    );
  }

  // control
  return (
    <div className="space-y-6" data-testid="empty-activation" data-variant="control">
      {hero}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {importCard}
        {addCard}
      </div>
      {warrenBlock}
    </div>
  );
}
