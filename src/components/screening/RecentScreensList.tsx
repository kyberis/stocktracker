"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScreeningRunListItem } from "@/lib/screening/schemas";
import { useScreeningCopy } from "./use-screening-copy";

function relativeTime(iso: string, locale: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale.startsWith("es") ? "es" : "en", {
    numeric: "auto",
  });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

export function RecentScreensList() {
  const { copy, language } = useScreeningCopy();
  const rs = copy.entry.recentScreens;
  const [runs, setRuns] = useState<ScreeningRunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/screening/runs", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setError("load_failed");
          return;
        }
        const data = (await res.json()) as { runs?: ScreeningRunListItem[] };
        if (!cancelled) setRuns(Array.isArray(data.runs) ? data.runs : []);
      } catch {
        if (!cancelled) setError("load_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || runs == null) {
    return null; // keep entry page quiet on first paint / soft fail
  }

  const statusLabel = (status: ScreeningRunListItem["status"]) => {
    switch (status) {
      case "queued":
        return rs.statusQueued;
      case "running":
        return rs.statusRunning;
      case "completed":
        return rs.statusCompleted;
      case "failed":
        return rs.statusFailed;
      default:
        return status;
    }
  };

  return (
    <section className="card mt-6 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
      <h2 className="text-base font-bold text-[color:var(--foreground)]">
        {rs.title}
      </h2>
      {runs.length === 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--muted)]">{rs.empty}</p>
      ) : (
        <ul className="mt-3 list-none space-y-2 p-0">
          {runs.map((run) => {
            const href = `/screening/runs/${encodeURIComponent(run.runId)}`;
            const cta = run.reportReady ? rs.viewReport : rs.viewProgress;
            return (
              <li key={run.runId}>
                <Link
                  href={href}
                  className="flex flex-col gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5 transition hover:border-teal-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[color:var(--foreground)]">
                        {run.intent === "rebalance"
                          ? rs.intentRebalance
                          : run.intent === "analyze"
                            ? rs.intentAnalyze
                            : rs.intentExplore}
                      </span>
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
                        {statusLabel(run.status)}
                      </span>
                      {run.mocked ? (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          {rs.mockedBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[color:var(--muted)]">
                      {run.summary}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                      {relativeTime(run.createdAt, language)}
                      {run.candidateCount != null
                        ? ` · ${run.candidateCount}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-teal-700 dark:text-teal-300">
                    {cta} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
