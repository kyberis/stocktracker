"use client";

import type { KeyboardEvent } from "react";
import { useJobsNav } from "@/contexts/jobs-nav-context";
import { JOBS_NAV_JOB_LABEL_KEYS, JOBS_NAV_JOBS, type JobsNavJob } from "@/lib/jobs-nav";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";

const JOB_DOT: Record<JobsNavJob, string> = {
  alta: "bg-emerald-500",
  evaluar: "bg-sky-400",
  descubrir: "bg-amber-400",
};

export default function JobsNavSwitcher({ stacked = false }: { stacked?: boolean }) {
  const { t } = useI18n();
  const track = useTrack();
  const { job, setJob } = useJobsNav();

  function select(next: JobsNavJob) {
    if (next === job) return;
    setJob(next);
    track("jobs_nav_job_selected", { job: next });
    requestAnimationFrame(() => {
      document.getElementById(`jobs-nav-tab-${next}`)?.focus();
    });
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = JOBS_NAV_JOBS.indexOf(job);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select(JOBS_NAV_JOBS[(idx + 1) % JOBS_NAV_JOBS.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select(JOBS_NAV_JOBS[(idx - 1 + JOBS_NAV_JOBS.length) % JOBS_NAV_JOBS.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(JOBS_NAV_JOBS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      select(JOBS_NAV_JOBS[JOBS_NAV_JOBS.length - 1]);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={t("jobsNavAriaLabel")}
      onKeyDown={onListKeyDown}
      className={
        stacked
          ? "grid w-full grid-cols-3 gap-0.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5"
          : "inline-flex shrink-0 gap-0.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5"
      }
    >
      {JOBS_NAV_JOBS.map((id) => {
        const selected = id === job;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`jobs-nav-tab-${id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(id)}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              selected
                ? "bg-[color:var(--surface-highlight-strong)] text-[color:var(--foreground)] shadow-sm"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${JOB_DOT[id]}`} aria-hidden="true" />
            {t(JOBS_NAV_JOB_LABEL_KEYS[id])}
          </button>
        );
      })}
    </div>
  );
}
