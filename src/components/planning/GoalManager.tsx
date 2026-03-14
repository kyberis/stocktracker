"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { formatCurrency } from "@/lib/utils";
import GoalCard from "./GoalCard";
import type { Goal, GoalType, GoalMilestone } from "@/lib/types";

const GOAL_TYPE_OPTIONS: { type: GoalType; emoji: string; label: string }[] = [
  { type: "house", emoji: "🏠", label: "House" },
  { type: "education", emoji: "🎓", label: "Education" },
  { type: "emergency_fund", emoji: "🛡️", label: "Emergency Fund" },
  { type: "vacation", emoji: "🏖️", label: "Vacation" },
  { type: "fire", emoji: "🔥", label: "FIRE" },
  { type: "retirement", emoji: "👴", label: "Retirement" },
  { type: "custom", emoji: "🎯", label: "Custom" },
];

const DEFAULT_TARGETS: Record<GoalType, number> = {
  retirement: 500000,
  house: 80000,
  education: 45000,
  emergency_fund: 15000,
  vacation: 5000,
  fire: 750000,
  custom: 100000,
};

const DEFAULT_NAMES: Record<GoalType, string> = {
  retirement: "Retirement Fund",
  house: "House Down Payment",
  education: "Education Fund",
  emergency_fund: "Emergency Fund",
  vacation: "Vacation Fund",
  fire: "FIRE Goal",
  custom: "Custom Goal",
};

const DEFAULT_MILESTONES: GoalMilestone[] = [
  { percent: 25, label: "25%", reachedAt: null },
  { percent: 50, label: "50%", reachedAt: null },
  { percent: 75, label: "75%", reachedAt: null },
  { percent: 100, label: "100%", reachedAt: null },
];

export default function GoalManager() {
  const {
    goals,
    saveGoal,
    deleteGoal,
    refreshGoals,
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency,
    activePortfolioId,
  } = usePortfolio();

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      calculatePortfolioTotals(
        holdings,
        cashEntries,
        quotes,
        exchangeRates,
        activePortfolioCurrency
      ),
    [holdings, cashEntries, quotes, exchangeRates, activePortfolioCurrency]
  );

  const portfolioGoals = useMemo(
    () =>
      goals.filter((g) => !activePortfolioId || g.portfolioId === activePortfolioId),
    [goals, activePortfolioId]
  );

  const handleAddGoal = async (goalType: GoalType) => {
    setShowTypePicker(false);
    await saveGoal({
      name: DEFAULT_NAMES[goalType],
      goalType,
      targetAmount: DEFAULT_TARGETS[goalType],
      milestones: DEFAULT_MILESTONES,
      portfolioId: activePortfolioId ?? "",
      currency: activePortfolioCurrency,
      growthRate: 7,
      horizon: 20,
      yearlyContribution: 0,
      monthlyContribution: 0,
      contributionMode: "monthly",
      reinvestDividends: false,
      targetDate: null,
      priority: 0,
      notes: "",
      icon: "",
      color: "",
    });
    await refreshGoals();
  };

  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
    await refreshGoals();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          My Goals
        </h2>
        <button
          type="button"
          onClick={() => setShowTypePicker((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Goal
        </button>
      </div>

      {showTypePicker && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
          {GOAL_TYPE_OPTIONS.map(({ type, emoji, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAddGoal(type)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-colors"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      {portfolioGoals.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}>
          {portfolioGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentValue={totals.totalCurrentEUR}
              baseCurrency={activePortfolioCurrency}
              onEdit={setEditingGoalId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-3xl mb-4">
            🎯
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-center mb-4">
            Set your first financial goal
          </p>
          <button
            type="button"
            onClick={() => setShowTypePicker(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Goal
          </button>
        </div>
      )}

      {editingGoalId && (
        <div className="sr-only" aria-live="polite">
          Editing goal {editingGoalId}
        </div>
      )}
    </div>
  );
}
