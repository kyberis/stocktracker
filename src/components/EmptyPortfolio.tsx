"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import WarrenAvatar from "@/components/warren/WarrenAvatar";

/** Classic empty portfolio CTA — shared by Dashboard and Home v2. */
export default function EmptyPortfolio({
  onAddStock,
  onAskWarren,
}: {
  onAddStock: () => void;
  onAskWarren?: (prompt: string) => void;
}) {
  const { t } = useI18n();
  const [chatInput, setChatInput] = useState("");

  const submitChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !onAskWarren) return;
    onAskWarren(trimmed);
    setChatInput("");
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("emptyStateTitle")}</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">{t("emptyStateSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/import"
          className="group card p-5 flex flex-col items-center text-center hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("emptyStateImport")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateImportDesc")}</p>
        </a>

        <button
          type="button"
          onClick={onAddStock}
          className="group card p-5 flex flex-col items-center text-center hover:border-violet-400 dark:hover:border-violet-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("addStock")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateAddDesc")}</p>
        </button>
      </div>

      {onAskWarren && (
        <div className="card border-amber-500/16 bg-amber-500/[0.06] p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <WarrenAvatar size={28} />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {t("emptyStateWarrenChatTitle") || "Or just tell Warren"}
            </p>
          </div>
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
              aria-label={t("send") || "Send"}
              className="shrink-0 w-11 h-11 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.874L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
