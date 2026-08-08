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

function fanOutSubtext(
  step: ScreeningRunStep,
  copy: ReturnType<typeof useScreeningCopy>["copy"],
): string | null {
  if (step.subStepsTotal == null || step.subStepsTotal <= 1) return null;
  const done = step.subStepsDone ?? 0;
  if (done <= 0) {
    return fill(copy.progress.irInvestigating, { total: step.subStepsTotal });
  }
  return (copy.progress.irSubtext ?? "{done}/{total} tickers")
    .replace("{done}", String(done))
    .replace("{total}", String(step.subStepsTotal));
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
  const subtext = fanOutSubtext(step, copy);
  const statusLine =
    step.status === "running"
      ? qaLine || copy.progress.statusRunningLine
      : step.status === "done"
        ? copy.progress.statusDoneLine
        : step.status === "failed"
          ? copy.progress.statusFailed
          : null;
  const errorDetail =
    step.status === "failed" && step.errorMessage
      ? fill(copy.progress.failedStepDetail, { message: step.errorMessage })
      : null;

  return (
    <li
      className={`animate-in fade-in slide-in-from-bottom-1 duration-300 ${
        step.status === "failed" ? "text-red-700 dark:text-red-300" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className={`text-[15px] font-semibold tracking-tight ${
            step.status === "running"
              ? "text-[color:var(--foreground)]"
              : step.status === "done"
                ? "text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]"
          }`}
        >
          {label}
        </h2>
        <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--muted)]">
          {step.elapsedSeconds != null
            ? `${step.elapsedSeconds.toFixed(1)}s`
            : step.status === "running"
              ? "…"
              : ""}
        </span>
      </div>
      {statusLine ? (
        <p
          className={`mt-0.5 text-[13px] ${
            step.status === "running"
              ? "animate-pulse text-teal-700 dark:text-teal-300"
              : "text-[color:var(--muted)]"
          }`}
        >
          {statusLine}
        </p>
      ) : null}
      {subtext ? (
        <p className="mt-0.5 text-[12px] text-[color:var(--muted)]">{subtext}</p>
      ) : null}
      {errorDetail ? (
        <p className="mt-0.5 text-[12px] text-red-600 dark:text-red-400" role="alert">
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
  const pollsRef = useRef(0);
  const briefRef = useRef<ScreeningBrief | null>(null);
  const [backHref, setBackHref] = useState("/screening/intake");
  const feedEndRef = useRef<HTMLDivElement | null>(null);

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

  const visibleSteps = (run?.steps ?? []).filter(
    (s) => s.status !== "pending" && s.status !== "skipped",
  );

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [visibleSteps.length, run?.progressPct]);

  if (showReport && report) {
    return (
      <main className="mx-auto w-full max-w-xl px-3 py-6 sm:px-4">
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
    qaContext && qaRoundInFlight
      ? fill(copy.progress.qaVerifyingRound, {
          round: qaRoundInFlight,
          max: qaContext.maxRounds,
        })
      : null;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col px-3 pb-6 pt-8 sm:px-4">
      <header className="shrink-0 text-center">
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

      <div
        className="mt-6 h-1 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]"
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

      <ul className="mt-8 list-none space-y-5 p-0" aria-live="polite">
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

      <div className="mt-8 flex flex-wrap justify-center gap-2">
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

      <ScreeningDisclaimer className="mt-auto pt-6 text-center" />
    </main>
  );
}
