"use client";

import {
  SCREENING_CRITERIA,
  SCREENING_MAX_SCORE,
  criterionStatus,
  type CriterionStatus,
} from "@/lib/screening/criteria";
import { fill } from "@/lib/screening/copy";
import { useScreeningCopy } from "./use-screening-copy";

const MARKS: Record<CriterionStatus, string> = {
  pass: "✓",
  fail: "✕",
  not_scored: "–",
  unknown: "?",
};

const ITEM_TONE: Record<CriterionStatus, string> = {
  pass: "border-[color:var(--border)]",
  fail: "border-[color:var(--border)]",
  not_scored: "border-[color:var(--border)] opacity-70",
  unknown: "border-[color:var(--border)] opacity-70",
};

const MARK_TONE: Record<CriterionStatus, string> = {
  pass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  fail: "bg-red-500/12 text-red-600 dark:text-red-400",
  not_scored: "bg-white/5 text-[color:var(--muted)]",
  unknown: "bg-white/5 text-[color:var(--muted)]",
};

/**
 * Supporting methodology checklist (collapsed by default). The product verdict
 * is the three category axes on the card; this list is evidence detail only.
 */
export function CriteriaList({
  passed,
  failed,
  score,
}: {
  passed: number[];
  failed: number[];
  score: number | null;
}) {
  const { copy } = useScreeningCopy();
  const labels = copy.criteria.labels;
  const metCount = score ?? passed.length;

  return (
    <details className="mt-4 group">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 rounded-lg px-0.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-teal-300 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="group-open:hidden">{copy.criteria.showChecklist}</span>
          <span className="hidden group-open:inline">{copy.criteria.hideChecklist}</span>
          <span className="ml-2 font-normal normal-case tracking-normal text-[color:var(--muted)]">
            ({copy.criteria.title})
          </span>
        </span>
        {metCount > 0 && (
          <span className="text-xs font-normal normal-case tracking-normal text-[color:var(--muted)]">
            {fill(copy.criteria.count, {
              passed: metCount,
              max: SCREENING_MAX_SCORE,
            })}
          </span>
        )}
      </summary>

      <ul className="mt-2 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {SCREENING_CRITERIA.map((criterion) => {
          const status = criterionStatus(criterion, passed, failed);
          const label = labels[criterion.key as keyof typeof labels];
          const note =
            status === "not_scored"
              ? `${copy.criteria.notScoredPrefix} · ${label.hint}`
              : status === "unknown"
                ? copy.criteria.unknownNote
                : label.hint;

          return (
            <li
              key={criterion.id}
              className={`flex items-start gap-2 rounded-xl border bg-[color:var(--surface-soft)] px-2.5 py-2 ${ITEM_TONE[status]}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md text-[11px] font-bold ${MARK_TONE[status]}`}
              >
                {MARKS[status]}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[12.5px] font-medium ${
                    status === "pass"
                      ? "text-[color:var(--foreground)]"
                      : "text-[color:var(--muted)]"
                  }`}
                >
                  {label.name}
                  <span className="sr-only">
                    {" "}
                    —{" "}
                    {status === "pass"
                      ? copy.criteria.legendPass
                      : status === "fail"
                        ? copy.criteria.legendFail
                        : status === "unknown"
                          ? copy.criteria.unknownNote
                          : copy.criteria.legendNotScored}
                  </span>
                </span>
                <span className="block text-[11px] text-[color:var(--muted)]">{note}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-[color:var(--muted)]">
        <span>
          <b className="text-emerald-600 dark:text-emerald-400">✓</b> {copy.criteria.legendPass}
        </span>
        <span>
          <b className="text-red-600 dark:text-red-400">✕</b> {copy.criteria.legendFail}
        </span>
        <span>
          <b>–</b> {copy.criteria.legendNotScored}
        </span>
      </p>
    </details>
  );
}
