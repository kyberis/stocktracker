"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ScreeningBrief, ScreeningReport, ScreeningRun, ScreeningRunStep } from "@/lib/screening/schemas";
import {
  buildIntakeHrefFromBrief,
  SCREENING_INTAKE_RETURN_KEY,
} from "@/lib/screening/intake-href";
import { MockNotice, ScreeningDisclaimer } from "./ScreeningNotices";
import { ScreeningReportView } from "./ScreeningReportView";
import { useScreeningCopy } from "./use-screening-copy";

const POLL_MS = 1200;
const MAX_POLLS = 120;

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
  }[step.status];

  const mark =
    step.status === "done" ? "✓" : step.status === "running" ? "•" : step.status === "failed" ? "✕" : "";
  const markTone =
    step.status === "done"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : step.status === "running"
        ? "bg-teal-500/15 text-teal-600 dark:text-teal-300 animate-pulse"
        : step.status === "failed"
          ? "bg-red-500/12 text-red-600 dark:text-red-400"
          : "bg-white/5 text-[color:var(--muted)]";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${markTone}`}
      >
        {mark}
      </span>
      <span
        className={`min-w-0 flex-1 text-[13px] ${
          step.status === "pending"
            ? "text-[color:var(--muted)]"
            : "text-[color:var(--foreground)]"
        }`}
      >
        {label}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--muted)]">
        {step.elapsedSeconds != null ? `${step.elapsedSeconds.toFixed(1)}s` : statusLabel}
      </span>
    </li>
  );
}

export function RunProgress({ runId }: { runId: string }) {
  const { copy } = useScreeningCopy();
  const [run, setRun] = useState<ScreeningRun | null>(null);
  const [report, setReport] = useState<ScreeningReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollsRef = useRef(0);
  const briefRef = useRef<ScreeningBrief | null>(null);
  const [backHref, setBackHref] = useState("/screening/intake");

  useEffect(() => {
    const brief = readStoredBrief(runId);
    briefRef.current = brief;
    setBackHref(readIntakeReturn(runId, brief));
  }, [runId]);

  const loadReport = useCallback(async () => {
    const count = briefRef.current?.candidateCount;
    const qs = count ? `?candidates=${count}` : "";
    const res = await fetch(`/api/screening/reports/${encodeURIComponent(runId)}${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError(copy.report.loadError);
      return;
    }
    const data = (await res.json()) as { report?: ScreeningReport };
    if (data.report) setReport(data.report);
    else setError(copy.report.loadError);
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
          setError(res.status === 404 ? copy.report.loadError : copy.progress.failed);
          return;
        }
        const data = (await res.json()) as { run?: ScreeningRun };
        if (!data.run || cancelled) return;
        setRun(data.run);

        if (data.run.reportReady) {
          await loadReport();
          return;
        }
        if (data.run.status === "failed") {
          setError(copy.progress.failed);
          return;
        }
        if (pollsRef.current < MAX_POLLS) {
          timer = setTimeout(() => void poll(), POLL_MS);
        }
      } catch {
        if (!cancelled) setError(copy.report.loadError);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, loadReport, copy.progress.failed, copy.report.loadError]);

  if (report) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
        <ScreeningReportView report={report} mocked={run?.mocked ?? true} />
        <div className="mt-5 flex flex-wrap gap-2">
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

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {copy.progress.eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
        {copy.progress.title}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{copy.progress.body}</p>

      <MockNotice className="mt-4" />

      {error ? (
        <p className="card mt-5 rounded-[20px] p-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <section className="card mt-5 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]"
            role="progressbar"
            aria-valuenow={run?.progressPct ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-teal-500/70 transition-[width] duration-500"
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
      )}

      <div className="mt-5 flex flex-wrap gap-2">
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
