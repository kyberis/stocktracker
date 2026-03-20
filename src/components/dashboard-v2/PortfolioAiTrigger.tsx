"use client";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

interface Props {
  onOpen: () => void;
  usageCount?: number;
  usageLimit?: number;
}

export default function PortfolioAiTrigger({ onOpen }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const tokensUsed = user?.aiTokensThisMonth ?? 0;
  const tokenLimit = user?.aiTokenLimit ?? 25_000;
  const pct = tokenLimit > 0 ? Math.min((tokensUsed / tokenLimit) * 100, 100) : 0;

  return (
    <button
      onClick={onOpen}
      className="w-full card p-3 bg-gradient-to-br from-violet-500/[0.06] to-indigo-500/[0.04] border-violet-500/20 hover:border-violet-500/40 hover:-translate-y-px transition-all cursor-pointer text-left"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-300">{t("v2PortfolioAi")}</span>
            {isPro && (
              <span className="text-[9px] font-semibold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full">
                PRO
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5">{t("v2AskAnything")}</p>
        </div>
        <svg className="w-4 h-4 text-gray-500 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-[3px] rounded-full bg-gray-200 dark:bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] text-gray-500 dark:text-slate-500 shrink-0 tabular-nums">
          {Math.round(pct)}% · ~{Math.floor((tokenLimit - tokensUsed) / 3000)} {t("aiAnalysesRemaining").replace("~{count} ", "")}
        </span>
      </div>
    </button>
  );
}
