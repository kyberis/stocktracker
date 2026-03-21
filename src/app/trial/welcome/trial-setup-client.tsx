"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

type StepStatus = "pending" | "running" | "done";

interface Step {
  label: string;
  status: StepStatus;
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
      aria-hidden
    />
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TrialSetupInner() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const ranRef = useRef(false);
  const [trialEnds] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [steps, setSteps] = useState<Step[]>([
    { label: "Setting up your portfolio history...", status: "pending" },
    { label: "Preparing your analytics...", status: "pending" },
    { label: "Enabling Pro features...", status: "pending" },
  ]);
  const [progress, setProgress] = useState(0);

  const trialEndsLabel = useMemo(
    () =>
      trialEnds.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [trialEnds],
  );

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      const updateStep = (index: number, status: StepStatus) => {
        setSteps((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status };
          return next;
        });
      };

      const total = 3;
      const bump = (completed: number) => setProgress((completed / total) * 100);

      updateStep(0, "running");
      try {
        await fetch("/api/portfolio/backfill-snapshots", { method: "POST", credentials: "include" });
      } catch {
        /* non-fatal */
      }
      updateStep(0, "done");
      bump(1);

      updateStep(1, "running");
      await new Promise((r) => setTimeout(r, 1500));
      updateStep(1, "done");
      bump(2);

      updateStep(2, "running");
      await refreshUser();
      updateStep(2, "done");
      bump(3);

      await new Promise((r) => setTimeout(r, 1000));
      router.push("/");
    };

    run().catch(() => {
      router.push("/");
    });
  }, [refreshUser, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-100 dark:bg-slate-950 safe-area-top">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xl p-8">
        <p className="text-center text-xl font-semibold text-emerald-600 dark:text-emerald-500 mb-6">trefolio</p>
        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Welcome to Trefolio Pro!</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">We&apos;re setting up your Pro experience</p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="mt-8 space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {step.status === "done" ? (
                  <CheckIcon />
                ) : step.status === "running" ? (
                  <Spinner />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                )}
              </span>
              <span className={step.status === "pending" ? "opacity-60" : ""}>{step.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500">
          Your trial ends on <span className="font-medium text-slate-700 dark:text-slate-300">{trialEndsLabel}</span>
        </p>
      </div>
    </div>
  );
}

export default function TrialSetupClient() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TrialSetupInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
