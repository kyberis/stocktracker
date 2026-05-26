"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import type { Holding } from "@/lib/types";

const DISMISS_KEY = "trefolio_goal_prompt_dismissed";

interface Props {
  holdings: Holding[];
}

export default function GoalPromptCard({ holdings }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { goal, demoMode } = usePortfolio();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (demoMode) return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, [demoMode]);

  if (demoMode || dismissed || goal || holdings.length === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="card relative rounded-[var(--radius-card)] border border-[color:var(--border)] p-3 group">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={t("dismiss")}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/14 bg-emerald-500/12">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-900 dark:text-white">{t("goalPromptTitle")}</div>
          <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{t("goalPromptSubtitle")}</div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/tools/projection")}
          className="shrink-0 rounded-xl border border-emerald-500/16 bg-emerald-500/14 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
        >
          {t("goalPromptCta")}
        </button>
      </div>
    </div>
  );
}
