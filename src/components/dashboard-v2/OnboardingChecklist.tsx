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
  onOpenAddStock?: () => void;
}

const RING_R = 14;
const RING_C = 2 * Math.PI * RING_R;

function MiniRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? completed / total : 0;
  const offset = RING_C - RING_C * pct;

  return (
    <div className="relative w-8 h-8 shrink-0">
      <svg className="-rotate-90" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle
          cx="16" cy="16" r={RING_R}
          fill="none" strokeWidth="3"
          className="stroke-gray-100 dark:stroke-white/[0.08]"
        />
        <circle
          cx="16" cy="16" r={RING_R}
          fill="none" strokeWidth="3" strokeLinecap="round"
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900 dark:text-white tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}

export default function OnboardingChecklist({ onOpenAddStock }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { demoMode } = usePortfolio();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchChecklist = useCallback(async () => {
    if (demoMode) { setLoading(false); return; }
    try {
      const res = await fetch("/api/auth/checklist");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error("[OnboardingChecklist] Failed to load checklist:", res.status);
      }
    } catch (err) {
      console.error("[OnboardingChecklist] Error loading checklist:", err);
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
      } else {
        console.error("[OnboardingChecklist] Failed to mark step:", step, res.status);
      }
    } catch (err) {
      console.error("[OnboardingChecklist] Error marking step:", step, err);
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
    } catch (err) {
      console.error("[OnboardingChecklist] Error dismissing checklist:", err);
    }
  }, []);

  if (demoMode || !user) return null;
  if (loading) return <div className="card rounded-xl h-[52px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" />;
  if (!data || data.dismissed) return null;

  const completedCount = data.steps.filter((s) => s.completedAt).length;
  const total = data.steps.length;
  const allDone = completedCount === total;
  const pct = total > 0 ? (completedCount / total) * 100 : 0;

  if (allDone) return null;

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
      onAction: () => { window.location.href = "/tools?tab=alerts"; },
    },
    {
      step: "explore_tools",
      labelKey: "checklistExploreTools",
      actionKey: "checklistViewTools",
      onAction: () => { window.location.href = "/tools"; },
    },
  ];

  return (
    <div className="card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
        aria-expanded={expanded}
        aria-controls="onboarding-checklist-body"
      >
        <MiniRing completed={completedCount} total={total} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("checklistTitle")}</p>
          <div className="h-1 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={2}
          className={`shrink-0 text-gray-400 dark:text-slate-500 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id="onboarding-checklist-body"
        className="grid transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 dark:border-white/[0.04] px-3 pb-3">
            {STEPS.map((item) => {
              const stepData = data.steps.find((s) => s.step === item.step);
              const done = !!stepData?.completedAt;

              return (
                <div key={item.step} className="flex items-center gap-2 py-1.5">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                      done
                        ? "bg-emerald-500"
                        : "border border-gray-300 dark:border-slate-600"
                    }`}
                  >
                    {done && (
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <span
                    className={`text-[11px] flex-1 ${
                      done
                        ? "text-gray-400 dark:text-slate-500 line-through"
                        : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {t(item.labelKey as keyof typeof t)}
                  </span>

                  {!done && (
                    item.actionHref ? (
                      <a
                        href={item.actionHref}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap hover:underline"
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
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap hover:underline"
                      >
                        {t(item.actionKey as keyof typeof t)} &rarr;
                      </button>
                    )
                  )}
                </div>
              );
            })}

            <button
              onClick={dismiss}
              className="mt-1 text-[10px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            >
              {t("checklistDismiss")} &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
