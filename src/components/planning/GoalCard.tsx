"use client";

import type { Goal, GoalType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const GOAL_TYPE_META: Record<
  GoalType,
  { emoji: string; label: string; bg: string; gradient: string }
> = {
  retirement: { emoji: "👴", label: "Retirement", bg: "bg-violet-100 dark:bg-violet-500/20", gradient: "from-violet-400 to-violet-600" },
  fire: { emoji: "🔥", label: "FIRE", bg: "bg-orange-100 dark:bg-orange-500/20", gradient: "from-orange-400 to-orange-600" },
  house: { emoji: "🏠", label: "House", bg: "bg-blue-100 dark:bg-blue-500/20", gradient: "from-blue-400 to-blue-600" },
  education: { emoji: "🎓", label: "Education", bg: "bg-amber-100 dark:bg-amber-500/20", gradient: "from-amber-400 to-amber-600" },
  emergency_fund: { emoji: "🛡️", label: "Emergency", bg: "bg-rose-100 dark:bg-rose-500/20", gradient: "from-rose-400 to-rose-600" },
  vacation: { emoji: "🏖️", label: "Vacation", bg: "bg-cyan-100 dark:bg-cyan-500/20", gradient: "from-cyan-400 to-cyan-600" },
  custom: { emoji: "🎯", label: "Custom", bg: "bg-emerald-100 dark:bg-emerald-500/20", gradient: "from-emerald-400 to-emerald-600" },
};

export interface GoalCardProps {
  goal: Goal;
  currentValue: number;
  baseCurrency: string;
  onEdit: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

function computeTimeToGoal(
  currentValue: number,
  targetAmount: number,
  growthRate: number,
  yearlyContribution: number
): { years: number; months: number } | null {
  if (currentValue >= targetAmount || targetAmount <= 0) return null;
  const rate = growthRate / 100;
  if (rate <= 0) return null;
  let value = currentValue;
  const maxYears = 200;
  for (let y = 1; y <= maxYears; y++) {
    value = value * (1 + rate) + yearlyContribution;
    if (value >= targetAmount) {
      const prev = (value - yearlyContribution) / (1 + rate);
      const fraction = prev < targetAmount ? (targetAmount - prev) / (value - prev) : 0;
      const exact = y - 1 + fraction;
      return { years: Math.floor(exact), months: Math.round((exact - Math.floor(exact)) * 12) };
    }
  }
  return null;
}

export default function GoalCard({
  goal,
  currentValue,
  baseCurrency,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const meta = GOAL_TYPE_META[goal.goalType];
  const progress = Math.min(100, (currentValue / goal.targetAmount) * 100);
  const yearly = goal.contributionMode === "yearly" ? goal.yearlyContribution : goal.monthlyContribution * 12;
  const monthly = goal.contributionMode === "monthly" ? goal.monthlyContribution : goal.yearlyContribution / 12;
  const timeToGoal = computeTimeToGoal(
    currentValue,
    goal.targetAmount,
    goal.growthRate,
    yearly
  );
  const milestones = goal.milestones.length > 0 ? goal.milestones : [
    { percent: 25, label: "25%", reachedAt: null },
    { percent: 50, label: "50%", reachedAt: null },
    { percent: 75, label: "75%", reachedAt: null },
    { percent: 100, label: "100%", reachedAt: null },
  ].sort((a, b) => a.percent - b.percent);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(goal.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(goal.id);
        }
      }}
      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 cursor-pointer transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${meta.bg}`}>
            {meta.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
              {goal.name}
            </h3>
            <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full ${meta.bg} text-gray-700 dark:text-gray-300`}>
              {meta.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(goal.id); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Edit goal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
            aria-label="Delete goal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-mono font-semibold text-gray-900 dark:text-white">
            {formatCurrency(currentValue, baseCurrency)}
          </span>
          <span className="text-gray-500 dark:text-slate-400 font-mono">
            of {formatCurrency(goal.targetAmount, baseCurrency)}
          </span>
        </div>
        <div className="mt-1.5 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 mb-3">
        {milestones.map((m) => {
          const reached = progress >= m.percent;
          return (
            <div
              key={m.percent}
              className={`w-2 h-2 rounded-full shrink-0 ${reached ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`}
              title={`${m.label} ${reached ? "reached" : ""}`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
        <span>
          {timeToGoal ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ~{timeToGoal.years}y {timeToGoal.months}m to goal
            </span>
          ) : (
            <span>{progress >= 100 ? "Goal reached" : "—"}</span>
          )}
        </span>
        <span className="font-mono">
          {formatCurrency(monthly, baseCurrency)}/mo
        </span>
      </div>
    </div>
  );
}
