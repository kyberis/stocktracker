"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import type { ChecklistStep } from "@/lib/db/checklist";

interface StepInfo {
  step: ChecklistStep;
  labelKey: string;
  actionKey: string;
  actionHref?: string;
  onAction?: () => void;
}

interface ChecklistData {
  steps: { step: ChecklistStep; completedAt: string | null }[];
  dismissed: boolean;
}

interface Props {
  onNavigateTools?: () => void;
  onOpenAddStock?: () => void;
  onNavigateAlerts?: () => void;
}

export default function OnboardingChecklist({ onNavigateTools, onOpenAddStock, onNavigateAlerts }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { demoMode } = usePortfolio();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChecklist = useCallback(async () => {
    if (demoMode) { setLoading(false); return; }
    try {
      const res = await fetch("/api/auth/checklist");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const markStep = useCallback(async (step: ChecklistStep) => {
    try {
      const res = await fetch("/api/auth/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismiss = useCallback(async () => {
    try {
      await fetch("/api/auth/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      setData((prev) => (prev ? { ...prev, dismissed: true } : prev));
    } catch {
      // ignore
    }
  }, []);

  if (demoMode || loading || !data || data.dismissed || !user) return null;

  const completedCount = data.steps.filter((s) => s.completedAt).length;
  const total = data.steps.length;
  const allDone = completedCount === total;

  if (allDone && data.dismissed) return null;

  const STEPS: StepInfo[] = [
    {
      step: "complete_profile",
      labelKey: "checklistCompleteProfile",
      actionKey: "checklistGoToProfile",
      actionHref: "/profile",
    },
    {
      step: "add_stock",
      labelKey: "checklistAddStock",
      actionKey: "checklistAddStockAction",
      onAction: onOpenAddStock,
    },
    {
      step: "create_alert",
      labelKey: "checklistCreateAlert",
      actionKey: "checklistSetAlert",
      onAction: onNavigateAlerts,
    },
    {
      step: "explore_tools",
      labelKey: "checklistExploreTools",
      actionKey: "checklistViewTools",
      onAction: onNavigateTools,
    },
  ];

  const pct = total > 0 ? (completedCount / total) * 100 : 0;

  if (allDone) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("checklistAllDone")}
          </div>
          <button onClick={dismiss} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
            {t("checklistDismiss")} &times;
          </button>
        </div>
        <div className="h-1 rounded-full bg-emerald-500/20 overflow-hidden mb-3">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
        </div>
        <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">{t("checklistAllDoneDesc")}</p>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("checklistTitle")}
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium tabular-nums">
          {completedCount} {t("checklistOf")} {total}
        </span>
      </div>

      <div className="h-1 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
        {STEPS.map((item) => {
          const stepData = data.steps.find((s) => s.step === item.step);
          const done = !!stepData?.completedAt;

          return (
            <div key={item.step} className="flex items-center gap-3 py-2.5">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300 dark:border-slate-600"
                }`}
              >
                {done && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <span
                className={`text-sm font-medium flex-1 ${
                  done
                    ? "text-gray-400 dark:text-slate-500 line-through"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {t(item.labelKey as keyof typeof t)}
              </span>

              {!done && (
                item.actionHref ? (
                  <a
                    href={item.actionHref}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap hover:underline"
                    onClick={() => markStep(item.step)}
                  >
                    {t(item.actionKey as keyof typeof t)} &rarr;
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      markStep(item.step);
                      item.onAction?.();
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap hover:underline"
                  >
                    {t(item.actionKey as keyof typeof t)} &rarr;
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
