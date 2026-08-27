"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import EmptyPortfolio from "@/components/EmptyPortfolio";
import AgentIntroGate from "@/components/agent-intro/AgentIntroGate";
import {
  clearExperimentPreview,
  setExperimentPreview,
} from "@/lib/experiment-preview";

interface ExperimentVariant {
  key: string;
  weight: number;
}

interface ExperimentSummary {
  id: string;
  key: string;
  name: string;
  variants: ExperimentVariant[];
}

function AdminExperimentPreviewInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyParam = searchParams.get("key")?.trim() || "";
  const variantParam = searchParams.get("variant")?.trim() || "control";

  const [experiment, setExperiment] = useState<ExperimentSummary | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (!keyParam || !variantParam) return;
    setExperimentPreview(keyParam, variantParam);
  }, [keyParam, variantParam]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/experiments");
        if (!res.ok) throw new Error("Failed to load experiments");
        const data = (await res.json()) as { experiments: ExperimentSummary[] };
        if (cancelled) return;
        const found = (data.experiments || []).find((e) => e.key === keyParam) || null;
        setExperiment(found);
        if (!found && keyParam) {
          setError(`Unknown experiment key: ${keyParam}`);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, keyParam]);

  const variants = useMemo(() => {
    if (experiment?.variants?.length) return experiment.variants.map((v) => v.key);
    return [variantParam || "control"];
  }, [experiment, variantParam]);

  const selectVariant = useCallback(
    (variant: string) => {
      if (!keyParam) return;
      setExperimentPreview(keyParam, variant);
      router.replace(
        `/admin/experiments/preview?key=${encodeURIComponent(keyParam)}&variant=${encodeURIComponent(variant)}`,
      );
    },
    [keyParam, router],
  );

  const exitPreview = useCallback(() => {
    clearExperimentPreview(keyParam || "all");
    router.push("/admin/experiments");
  }, [keyParam, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2000);
  };

  if (!user) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Loading…</div>
    );
  }

  if (user.role !== "admin") return null;

  if (!keyParam) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Missing <code className="font-mono text-xs">key</code> query param.
        </p>
        <Link href="/admin/experiments" className="text-sm text-indigo-600 dark:text-indigo-400">
          Back to experiments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Treatment preview
            </p>
            <h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {experiment?.name || keyParam}
            </h1>
            <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-slate-400">
              {keyParam} → {variantParam}
            </p>
            <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">
              Client-only override — does not write assignments or conversion events.
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={exitPreview}>
            Exit preview
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Variants">
          {variants.map((v) => {
            const active = v === variantParam;
            return (
              <button
                key={v}
                type="button"
                onClick={() => selectVariant(v)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-amber-600 text-white"
                    : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {toast && (
        <p className="text-xs text-gray-500 dark:text-slate-400" role="status">
          {toast}
        </p>
      )}

      {keyParam === "empty_activation" ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 sm:p-4">
          <EmptyPortfolio
            key={`${keyParam}:${variantParam}`}
            onAddStock={() => showToast("Preview: Add stock (no-op)")}
            onAskWarren={(prompt) => showToast(`Preview Warren: ${prompt.slice(0, 80)}`)}
          />
        </div>
      ) : keyParam === "warren_first_stock" ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {variantParam === "warren_first_stock" ? (
              <>
                Treatment preview: open{" "}
                <Link
                  href="/?activateFirstStock=1"
                  className="text-indigo-600 dark:text-indigo-400"
                >
                  Home with first-stock flag
                </Link>{" "}
                in this tab (session override is already set). Warren opens on the left with a
                prefilled Apple example. Does not auto-send.
              </>
            ) : (
              <>
                Control is the current empty import/add surface. Preview override is set — open{" "}
                <Link href="/" className="text-indigo-600 dark:text-indigo-400">
                  Home
                </Link>{" "}
                or use the empty state below.
              </>
            )}
          </p>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 sm:p-4">
            <EmptyPortfolio
              onAddStock={() => showToast("Preview: Add stock (no-op)")}
              onAskWarren={(prompt) => showToast(`Preview Warren: ${prompt.slice(0, 80)}`)}
            />
          </div>
        </div>
      ) : keyParam === "agent_intro" && (variantParam === "convergence" || variantParam === "briefing") ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Previewing variant <span className="font-mono text-xs">{variantParam}</span>. Open{" "}
            <Link href="/" className="text-indigo-600 dark:text-indigo-400">
              Home
            </Link>{" "}
            in this tab to see the full-screen intro over the live dashboard, or use the embedded mock below.
          </p>
          <div className="relative min-h-[480px] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--page-background)]">
            <AgentIntroGate
              isEmpty={false}
              demoMode={false}
              dashboardReady
              contained
              forceVariant={variantParam === "briefing" ? "briefing" : "convergence"}
            />
          </div>
        </div>
      ) : (
        <div className="card space-y-3 p-5 text-sm text-gray-600 dark:text-slate-300">
          <p>
            No dedicated preview surface is registered for{" "}
            <span className="font-mono text-xs">{keyParam}</span>. The override is set in
            this tab — open the product surface that uses this experiment to verify.
          </p>
          <Link href="/" className="inline-block text-indigo-600 dark:text-indigo-400">
            Go to Home
          </Link>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-slate-400">
        <Link href="/admin/experiments" className="text-indigo-600 dark:text-indigo-400">
          ← Back to experiments
        </Link>
      </p>
    </div>
  );
}

export default function AdminExperimentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Loading preview…</div>
      }
    >
      <AdminExperimentPreviewInner />
    </Suspense>
  );
}
