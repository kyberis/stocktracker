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
/** ~12 min — research fan-out over ~20 tickers (IR + Web + Tech) can be long. */
const MAX_POLLS = 600;

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

function formatLastUpdate(
  iso: string | null | undefined,
  copy: ReturnType<typeof useScreeningCopy>["copy"],
): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const ageSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (ageSec < 15) return copy.progress.lastUpdateJustNow;
  if (ageSec < 90) {
    return fill(copy.progress.lastUpdateSeconds, { n: ageSec });
  }
  return fill(copy.progress.lastUpdateMinutes, {
    n: Math.max(1, Math.round(ageSec / 60)),
  });
}

function activityForStep(
  step: ScreeningRunStep,
  copy: ReturnType<typeof useScreeningCopy>["copy"],
  qaLine?: string | null,
): string | null {
  const kind = step.agentKind as keyof typeof copy.progress.activity;
  const body = copy.progress.activity[kind] ?? null;
  if (step.status === "running") {
    if (step.agentKind === "qa" && qaLine) return qaLine;
    return body ?? copy.progress.statusRunningLine;
  }
  if (step.status === "done") return body;
  if (step.status === "failed") return copy.progress.statusFailed;
  return null;
}

function AgentFeedItem({
  step,
  label,
  qaLine,
}: {
  step: ScreeningRunStep;
  label: string;
  qaLine?: string | null;
}) {
  const { copy } = useScreeningCopy();
  const activity = activityForStep(step, copy, qaLine);
  const errorDetail =
    step.status === "failed" && step.errorMessage
      ? fill(copy.progress.failedStepDetail, { message: step.errorMessage })
      : null;
  const subCount =
    typeof step.subStepsTotal === "number" && step.subStepsTotal > 0
      ? fill(copy.progress.irSubtext, {
          done: step.subStepsDone ?? 0,
          total: step.subStepsTotal,
        })
      : null;

  return (
    <li
      className={`animate-in fade-in slide-in-from-bottom-1 duration-300 border-l-2 pl-4 ${
        step.status === "running"
          ? "border-teal-500/70"
          : step.status === "failed"
            ? "border-red-500/60"
            : "border-[color:var(--border)]"
      }`}
    >
      <h2
        className={`text-[15px] font-semibold tracking-tight ${
          step.status === "failed"
            ? "text-red-700 dark:text-red-300"
            : "text-[color:var(--foreground)]"
        }`}
      >
        {label}
        {subCount ? (
          <span className="ml-2 text-[13px] font-medium text-[color:var(--muted)]">
            {subCount}
          </span>
        ) : null}
      </h2>
      {activity ? (
        <p
          className={`mt-1.5 max-w-prose text-[14px] leading-relaxed ${
            step.status === "running"
              ? "animate-pulse text-[color:var(--foreground)]"
              : "text-[color:var(--muted)]"
          }`}
        >
          {activity}
        </p>
      ) : null}
      {errorDetail ? (
        <p className="mt-1 text-[12px] text-red-600 dark:text-red-400" role="alert">
          {errorDetail}
        </p>
      ) : null}
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
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const pollsRef = useRef(0);
  const briefRef = useRef<ScreeningBrief | null>(null);
  const [backHref, setBackHref] = useState("/screening/intake");
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const autoResumeAttemptedRef = useRef(false);

  useEffect(() => {
    const brief = readStoredBrief(runId);
    briefRef.current = brief;
    setBackHref(readIntakeReturn(runId, brief));
    setRun(buildOptimisticRun(runId));
    setReport(null);
    setShowReport(false);
    setLoadError(null);
    setPollTimedOut(false);
    setResumeError(null);
    pollsRef.current = 0;
    autoResumeAttemptedRef.current = false;
  }, [runId]);

  // Refresh relative "last update" copy while the run is in flight.
  useEffect(() => {
    if (!run || run.reportReady || run.status === "failed" || run.status === "completed") {
      return;
    }
    const id = setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [run?.reportReady, run?.status, run]);

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

  const resumeRun = useCallback(async () => {
    setResuming(true);
    setResumeError(null);
    try {
      const res = await fetch(
        `/api/screening/runs/${encodeURIComponent(runId)}/resume`,
        { method: "POST", cache: "no-store" },
      );
      if (!res.ok) {
        setResumeError(copy.progress.resumeFailed);
        return;
      }
      const data = (await res.json()) as { run?: ScreeningRun };
      if (data.run) {
        setRun(data.run);
        setPollTimedOut(false);
        pollsRef.current = 0;
      }
    } catch {
      setResumeError(copy.progress.resumeFailed);
    } finally {
      setResuming(false);
    }
  }, [runId, copy.progress.resumeFailed]);

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
        } else if (!cancelled) {
          setPollTimedOut(true);
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

  // Auto-resume once when the server marks the run stuck.
  useEffect(() => {
    if (!run || run.reportReady || run.status === "failed" || run.status === "completed") {
      return;
    }
    if (run.stallState !== "stuck") return;
    if (autoResumeAttemptedRef.current || resuming) return;
    autoResumeAttemptedRef.current = true;
    void resumeRun();
  }, [run, resuming, resumeRun]);

  const visibleSteps = (run?.steps ?? []).filter(
    (s) => s.status !== "pending" && s.status !== "skipped",
  );

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [visibleSteps.length, run?.progressPct]);

  if (showReport && report) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 lg:px-6">
        <ScreeningReportView report={report} mocked={run?.mocked ?? true} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowReport(false)}
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold"
          >
            {copy.progress.backToAgents}
          </button>
          <Link
            href={backHref}
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold"
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
  const qaRoundInFlight =
    qaContext && qaRunning
      ? Math.min(qaContext.maxRounds, qaContext.roundsCompleted + 1)
      : null;
  const qaVerifyingLine =
    qaContext && qaRoundInFlight ? copy.progress.qaVerifyingRound : null;
  const inFlight = Boolean(run && !reportReady && !runFailed && run.status !== "completed");
  const lastUpdateLine =
    inFlight ? formatLastUpdate(run?.lastActivityAt, copy) : null;
  // nowTick keeps the relative clock fresh
  void nowTick;
  const stallState = inFlight ? run?.stallState : undefined;
  const showResume =
    inFlight && (stallState === "stuck" || stallState === "stale" || pollTimedOut);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-3 pb-6 pt-8 sm:px-4">
      <header className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
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
        {lastUpdateLine ? (
          <p className="mt-1.5 text-xs text-[color:var(--muted)]" aria-live="polite">
            {lastUpdateLine}
            {typeof run?.progressPct === "number" ? ` · ${run.progressPct}%` : null}
          </p>
        ) : null}
      </header>

      {(run?.mocked ?? false) ? <MockNotice className="mt-4" /> : null}

      {loadError ? (
        <p className="mt-5 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      {runFailed && !loadError ? (
        <p className="mt-5 text-sm text-red-700 dark:text-red-300" role="alert">
          {copy.progress.failedBanner}
          {failedStep?.errorMessage
            ? ` (${failedStep.agentKind}: ${failedStep.errorMessage})`
            : ""}
        </p>
      ) : null}

      {stallState === "stale" && inFlight ? (
        <p className="mt-5 text-sm text-amber-800 dark:text-amber-200" role="status">
          {copy.progress.stallStale}
        </p>
      ) : null}

      {stallState === "stuck" && inFlight ? (
        <p className="mt-5 text-sm text-red-700 dark:text-red-300" role="alert">
          {copy.progress.stallStuck}
        </p>
      ) : null}

      {pollTimedOut && inFlight ? (
        <p className="mt-5 text-sm text-amber-800 dark:text-amber-200" role="status">
          {copy.progress.pollTimeout}
        </p>
      ) : null}

      {resumeError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {resumeError}
        </p>
      ) : null}

      <div
        className="mt-6 h-1 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]"
        role="progressbar"
        aria-valuenow={run?.progressPct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            runFailed || stallState === "stuck" ? "bg-red-500/70" : "bg-teal-500/70"
          }`}
          style={{ width: `${run?.progressPct ?? 0}%` }}
        />
      </div>

      <ul className="mt-8 list-none space-y-6 p-0" aria-live="polite">
        {visibleSteps.map((step) => (
          <AgentFeedItem
            key={step.agentKind}
            step={step}
            label={
              copy.progress.steps[step.agentKind as keyof typeof copy.progress.steps] ??
              step.agentKind
            }
            qaLine={step.agentKind === "qa" && qaRunning ? qaVerifyingLine : null}
          />
        ))}
        <div ref={feedEndRef} />
      </ul>

      <div className="mt-8 flex flex-wrap gap-2">
        {showResume ? (
          <button
            type="button"
            onClick={() => void resumeRun()}
            disabled={resuming}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60"
          >
            {resuming ? copy.progress.resumeWorking : copy.progress.resumeCta}
          </button>
        ) : null}
        {reportReady ? (
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loadingReport}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60"
          >
            {loadingReport ? copy.progress.loadingReport : copy.progress.seeReportCta}
          </button>
        ) : null}
        <Link
          href={backHref}
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
        >
          {copy.common.back}
        </Link>
      </div>

      <ScreeningDisclaimer className="mt-auto pt-6" />
    </main>
  );
}
