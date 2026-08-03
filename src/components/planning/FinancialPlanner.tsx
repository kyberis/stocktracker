"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import ProCompareCard from "../ProCompareCard";

const FireCalculator = dynamic(() => import("./FireCalculator"), { ssr: false });
const RetirementProjection = dynamic(() => import("./RetirementProjection"), { ssr: false });
const GoalManager = dynamic(() => import("./GoalManager"), { ssr: false });

type PlanningMode = "fire" | "retirement" | "goals";

export default function FinancialPlanner() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PlanningMode>("fire");

  if (user?.plan !== "pro" && user?.role !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Financial Planning
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            FIRE calculator, retirement projections, and multi-goal tracking
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-6 text-center text-sm text-gray-600 dark:text-slate-300">
          Available on Pro — FIRE calculator, retirement projections, and multi-goal tracking.
        </div>
        <ProCompareCard surface="planning_locked" reason="upgrade_required" />
      </div>
    );
  }

  const modes: { key: PlanningMode; label: string; icon: string }[] = [
    { key: "fire", label: "FIRE Calculator", icon: "🔥" },
    { key: "retirement", label: "Retirement", icon: "👴" },
    { key: "goals", label: "Goals", icon: "🎯" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Financial Planning
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          FIRE calculator, retirement projections, and multi-goal tracking
        </p>
      </div>

      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700 w-fit">
        {modes.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
              mode === key
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {mode === "fire" && <FireCalculator />}
      {mode === "retirement" && <RetirementProjection />}
      {mode === "goals" && <GoalManager />}
    </div>
  );
}
