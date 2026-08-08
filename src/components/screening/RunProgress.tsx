"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ScreeningBrief, ScreeningReport, ScreeningRun, ScreeningRunStep } from "@/lib/screening/schemas";
import {
  buildIntakeHrefFromBrief,
  SCREENING_INTAKE_RETURN_KEY,
} from "@/lib/screening/intake-href";
import { fill } from "@/lib/screening/copy";
import { buildOptimisticRun } from "@/lib/screening/pipeline/build-run";
import { MockNotice, ScreeningDisclaimer } from "./ScreeningNotices";
import { ScreeningReportView } from "./ScreeningReportView";
import { useScreeningCopy } from "./use-screening-copy";

const POLL_MS = 1200;
/** ~6 min — v2 fan-out (IR + Web × N) can exceed the old 2.4 min budget. */
const MAX_POLLS = 300;

function readStoredBrief(runId: string): ScreeningBrief | null {
  try {
    const raw = sessionStorage.getItem(`trefolio-screening-brief-${runId}`);
    return raw ? (JSON.parse(raw) as ScreeningBrief) : null;
  } catch {
    return null;
  }
}

function readIntakeReturn(runId: string, brief: ScreeningBrief | null): string {
  try {
    const stored = sessionStorage.getItem(SCREENING_INTAKE_RETURN_KEY(runId));
    if (stored && stored.startsWith("/screening/intake")) return stored;
  } catch {
    // ignore
  }
  return buildIntakeHrefFromBrief(brief);
}

function StepRow({ step, label }: { step: ScreeningRunStep; label: string }) {
  const { copy } = useScreeningCopy();
  const statusLabel = {
    pending: copy.progress.statusPending,
    running: copy.progress.statusRunning,
    done: copy.progress.statusDone,
    failed: copy.progress.statusFailed,
    skipped: copy.progress.statusSkipped,
  }[step.status];

  const mark =
    step.status === "done"
      ? "✓"
      : step.status === "running"
        ? "•"
        : step.status === "failed"
          ? "✕"
          : step.status === "skipped"
            ? "–"
            : "";
  const markTone =
    step.status === "done"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : step.status === "running"
        ? "bg-teal-500/15 text-teal-600 dark:text-teal-300 animate-pulse"
        : step.status === "failed"
          ? "bg-red-500/12 text-red-600 dark:text-red-400"
          : step.status === "skipped"
            ? "bg-[color:var(--muted)]/10 text-[color:var(--muted)] opacity-70"
            : "bg-white/5 text-[color:var(--muted)]";

  const subtext =
    step.subStepsTotal != null && step.subStepsTotal > 1
      ? (copy.progress.irSubtext ?? "{done}/{total} tickers")
          .replace("{done}", String(step.subStepsDone ?? 0))
          .replace("{total}", String(step.subStepsTotal))
      : null;

  const errorDetail =
    step.status === "failed" && step.errorMessage
      ? fill(copy.progress.failedStepDetail, { message: step.errorMessage })
      : null;

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
        step.status === "failed"
          ? "border-red-500/35 bg-red-500/[0.06]"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${markTone}`}
      >
        {mark}
      </span>
      <span
        className={`min-w-0 flex-1 text-[13px] ${
          step.status === "pending" || step.status === "skipped"
            ? "text-[color:var(--muted)]"
            : "text-[color:var(--foreground)]"
        }`}
      >
        <span className="block">{label}</span>
        {subtext ? (
          <span className="mt-0.5 block text-[11px] text-[color:var(--muted)]">
            {subtext}
          </span>
        ) : null}
        {errorDetail ? (
          <span className="mt-0.5 block text-[11px] text-red-600 dark:text-red-400" role="alert">
            {errorDetail}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--muted)]">
        {step.elapsedSeconds != null ? `${step.elapsedSeconds.toFixed(1)}s` : statusLabel}
      </span>
    </li>
  );
}

export function RunProgress({ runId }: { runId: string }) {
  const { copy } = useScreeningCopy();
  const [run, setRun] = useState<ScreeningRun | null>(() => buildOptimisticRun(runId));
  const [report, setReport] = useState<ScreeningReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  /** Fatal load errors (404 / network) — not step failures. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollsRef = useRef(0);
  const briefRef = useRef<ScreeningBrief | null>(null);
  const [backHref, setBackHref] = useState("/screening/intake");

  useEffect(() => {
    const brief = readStoredBrief(runId);
    briefRef.current = brief;
    setBackHref(readIntakeReturn(runId, brief));
    setRun(buildOptimisticRun(runId));
    setReport(null);
    setShowReport(false);
    setLoadError(null);
    pollsRef.current = 0;
  }, [runId]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    setLoadError(null);
    try {
      const count = briefRef.current?.candidateCount;
      const qs = count ? `?candidates=${count}` : "";
      const res = await fetch(`/api/screening/reports/${encodeURIComponent(runId)}${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setLoadError(copy.report.loadError);
        return;
      }
      const data = (await res.json()) as { report?: ScreeningReport };
      if (data.report) {
        setReport(data.report);
        setShowReport(true);
      } else {
        setLoadError(copy.report.loadError);
      }
    } catch {
      setLoadError(copy.report.loadError);
    } finally {
      setLoadingReport(false);
    }
  }, [runId, copy.report.loadError]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) return;
      pollsRef.current += 1;
      try {
        const res = await fetch(`/api/screening/runs/${encodeURIComponent(runId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(
              res.status === 404 ? copy.report.loadError : copy.progress.failed,
            );
          }
          return;
        }
        const data = (await res.json()) as { run?: ScreeningRun };
        if (!data.run || cancelled) return;
        setRun(data.run);
        setLoadError(null);

        // Keep the timeline visible on failure — do not replace the page.
        if (data.run.status === "failed") {
          return;
        }
        if (data.run.reportReady) return;
        if (pollsRef.current < MAX_POLLS) {
          timer = setTimeout(() => void poll(), POLL_MS);
        }
      } catch {
        if (!cancelled) setLoadError(copy.report.loadError);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, copy.progress.failed, copy.report.loadError]);

  if (showReport && report) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
        <ScreeningReportView report={report} mocked={run?.mocked ?? true} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowReport(false)}
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {copy.progress.backToAgents}
          </button>
          <Link
            href={backHref}
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {copy.common.back}
          </Link>
        </div>
      </main>
    );
  }

  const reportReady = Boolean(run?.reportReady);
  const runFailed = run?.status === "failed";
  const failedStep = run?.steps.find((s) => s.status === "failed");
  const qaStep = run?.steps.find((s) => s.agentKind === "qa");
  const qaRunning = qaStep?.status === "running";
  const qaContext = run?.qa ?? null;
  // While QA is running (round N in flight), show N = roundsCompleted + 1.
  const qaRoundInFlight =
    qaContext && qaRunning
      ? Math.min(qaContext.maxRounds, qaContext.roundsCompleted + 1)
      : null;
  const qaVerifyingLine =
    qaContext && qaRoundInFlight
      ? fill(copy.progress.qaVerifyingRound, {
          round: qaRoundInFlight,
          max: qaContext.maxRounds,
        })
      : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {copy.progress.eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
        {runFailed
          ? copy.progress.title
          : reportReady
            ? copy.progress.readyTitle
            : copy.progress.title}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {runFailed
          ? copy.progress.failedBanner
          : reportReady
            ? copy.progress.readyBody
            : copy.progress.body}
      </p>

      {(run?.mocked ?? false) ? <MockNotice className="mt-4" /> : null}

      {loadError ? (
        <p
          className="card mt-5 rounded-[20px] border border-red-500/30 p-4 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      {runFailed && !loadError ? (
        <p
          className="mt-5 rounded-xl border border-red-500/35 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {copy.progress.failedBanner}
          {failedStep?.errorMessage
            ? ` (${failedStep.agentKind}: ${failedStep.errorMessage})`
            : ""}
        </p>
      ) : null}

      {qaVerifyingLine && !runFailed ? (
        <p
          className="mt-5 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] px-3 py-2 text-sm text-teal-700 dark:text-teal-300"
          role="status"
        >
          {qaVerifyingLine}
        </p>
      ) : null}

      <section className="card mt-5 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]"
          role="progressbar"
          aria-valuenow={run?.progressPct ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              runFailed ? "bg-red-500/70" : "bg-teal-500/70"
            }`}
            style={{ width: `${run?.progressPct ?? 0}%` }}
          />
        </div>

        <ul className="mt-4 list-none space-y-2 p-0">
          {(run?.steps ?? []).map((step) => (
            <StepRow
              key={step.agentKind}
              step={step}
              label={
                copy.progress.steps[step.agentKind as keyof typeof copy.progress.steps] ??
                step.agentKind
              }
            />
          ))}
        </ul>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {reportReady ? (
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loadingReport}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
          >
            {loadingReport ? copy.progress.loadingReport : copy.progress.seeReportCta}
          </button>
        ) : null}
        <Link
          href={backHref}
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          {copy.common.back}
        </Link>
      </div>

      <ScreeningDisclaimer className="mt-4" />
    </main>
  );
}
