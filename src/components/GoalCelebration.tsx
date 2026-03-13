"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { useTrack } from "@/lib/use-track";
import type { Holding, CashEntry } from "@/lib/types";

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

const MILESTONE_CONFIG: Record<Milestone, { icon: string; titleKey: string; subKey: string }> = {
  25: { icon: "🌱", titleKey: "goalMilestone25", subKey: "goalMilestoneSub25" },
  50: { icon: "🎉", titleKey: "goalMilestone50", subKey: "goalMilestoneSub50" },
  75: { icon: "🔥", titleKey: "goalMilestone75", subKey: "goalMilestoneSub75" },
  100: { icon: "🏆", titleKey: "goalMilestone100", subKey: "goalMilestoneSub100" },
};

const STORAGE_PREFIX = "trefolio_goal_milestones_";
const DISMISS_MS = 8000;

function getCelebratedMilestones(goalId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${goalId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCelebratedMilestone(goalId: string, milestone: number) {
  if (typeof window === "undefined") return;
  const existing = getCelebratedMilestones(goalId);
  if (!existing.includes(milestone)) {
    localStorage.setItem(`${STORAGE_PREFIX}${goalId}`, JSON.stringify([...existing, milestone]));
  }
}

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function GoalCelebration({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { t } = useI18n();
  const {
    holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates,
    activePortfolioCurrency, goal, demoMode,
  } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;

  const track = useTrack();
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkedRef = useRef<string>("");

  const totals = useMemo(
    () => calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency]
  );

  const progress = useMemo(() => {
    if (!goal || goal.targetAmount <= 0) return 0;
    return Math.min(100, (totals.totalCurrentEUR / goal.targetAmount) * 100);
  }, [goal, totals.totalCurrentEUR]);

  useEffect(() => {
    if (demoMode || !goal || goal.targetAmount <= 0) return;

    const checkKey = `${goal.id}-${Math.floor(progress)}`;
    if (checkedRef.current === checkKey) return;
    checkedRef.current = checkKey;

    const celebrated = getCelebratedMilestones(goal.id);
    const newMilestone = [...MILESTONES].reverse().find(
      (m) => progress >= m && !celebrated.includes(m)
    );

    if (newMilestone) {
      saveCelebratedMilestone(goal.id, newMilestone);
      setActiveMilestone(newMilestone);
      setVisible(true);
      track("goal_milestone_reached", { milestone: String(newMilestone), goal_name: goal.name });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), DISMISS_MS);
    }
  }, [progress, goal, demoMode, track]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!visible || !activeMilestone || !goal) return null;

  const config = MILESTONE_CONFIG[activeMilestone];

  return (
    <div
      className="fixed bottom-36 sm:bottom-24 right-4 sm:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right-full duration-300 overflow-hidden"
      role="alert"
    >
      {/* CSS confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-sm opacity-0 animate-confetti"
            style={{
              left: `${8 + (i * 7.5)}%`,
              top: `${-4 - (i % 3) * 4}%`,
              backgroundColor: ["#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#ec4899", "#ef4444"][i % 6],
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-xl shrink-0">
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t(config.titleKey as never)}</p>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
            {(t(config.subKey as never) as string).replace("{name}", goal.name)}
          </p>
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full animate-goal-dismiss"
        />
      </div>
    </div>
  );
}
