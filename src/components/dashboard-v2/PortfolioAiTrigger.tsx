"use client";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { isPaidPlan, planOf } from "@/lib/plan-rank";

interface Props {
  onOpen: () => void;
  usageCount?: number;
  usageLimit?: number;
}

export default function PortfolioAiTrigger({ onOpen }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPro = isPaidPlan(planOf(user)) || isAdmin;
  const tokensUsed = user?.aiTokensThisMonth ?? 0;
  const tokenLimit = user?.aiTokenLimit ?? 25_000;
  const pct = isAdmin ? 0 : (tokenLimit > 0 ? Math.min((tokensUsed / tokenLimit) * 100, 100) : 0);

  return (
    <button
      onClick={onOpen}
      className="w-full cursor-pointer text-left transition-all hover:-translate-y-px card border-violet-500/16 bg-violet-500/[0.05] p-3 hover:border-violet-500/28"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-violet-500/16 bg-violet-500/12 text-violet-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-300">{t("v2PortfolioAi")}</span>
            {isPro && (
              <span className="rounded-full border border-violet-500/16 bg-violet-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                {isAdmin ? "ADMIN" : "PRO"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">{t("v2AskAnything")}</p>
        </div>
        <svg className="h-4 w-4 shrink-0 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
      {!isAdmin && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[color:var(--surface-highlight)]">
            <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 tabular-nums text-[9px] text-[color:var(--muted)]">
            {Math.round(pct)}% · ~{Math.floor((tokenLimit - tokensUsed) / 3000)} {t("aiAnalysesRemaining").replace("~{count} ", "")}
          </span>
        </div>
      )}
    </button>
  );
}
