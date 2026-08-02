"use client";

import type { ImportQualityFinding, ImportQualityReport } from "@/lib/import-quality";

interface Props {
  report: ImportQualityReport | null | undefined;
  labels: {
    title: string;
    fixed: string;
    needsReview: string;
    aiDisclaimer: string;
    empty: string;
  };
  onConfirmFinding?: (findingId: string) => void;
  confirmLabel?: string;
}

function severityClass(severity: ImportQualityFinding["severity"]): string {
  if (severity === "error") return "text-red-600 dark:text-red-400";
  if (severity === "warn") return "text-amber-700 dark:text-amber-400";
  return "text-[color:var(--muted)]";
}

export function ImportDataQualityPanel({
  report,
  labels,
  onConfirmFinding,
  confirmLabel = "Confirm fix",
}: Props) {
  if (!report) return null;
  if (report.findings.length === 0) {
    return (
      <div
        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 mb-4 text-sm text-[color:var(--muted)]"
        role="status"
      >
        {labels.empty}
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 mb-4"
      aria-label={labels.title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{labels.title}</h3>
        <p className="text-xs text-[color:var(--muted)]">
          {report.fixedCount > 0 ? `${report.fixedCount} ${labels.fixed}` : null}
          {report.fixedCount > 0 && report.needsReviewCount > 0 ? " · " : null}
          {report.needsReviewCount > 0 ? `${report.needsReviewCount} ${labels.needsReview}` : null}
        </p>
      </div>

      {report.aiSummary ? (
        <p className="text-sm text-[color:var(--foreground)] mb-2 leading-relaxed">
          {report.aiSummary}
          <span className="block text-xs text-[color:var(--muted)] mt-1">{labels.aiDisclaimer}</span>
        </p>
      ) : null}

      <ul className="space-y-2 max-h-48 overflow-y-auto" role="list">
        {report.findings.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-start justify-between gap-2 text-xs border-t border-[color:var(--border)] pt-2 first:border-0 first:pt-0"
          >
            <div className="min-w-0 flex-1">
              <span className={`font-medium ${severityClass(f.severity)}`}>
                {f.fixed ? `[${labels.fixed}] ` : f.autoFixable ? "" : `[${labels.needsReview}] `}
                {f.ticker || f.isin || f.code}
              </span>
              <p className="text-[color:var(--muted)] mt-0.5">{f.message}</p>
            </div>
            {!f.fixed && f.code === "recent_trade_price" && onConfirmFinding ? (
              <button
                type="button"
                className="btn-secondary text-xs px-2 py-1 min-h-[44px]"
                onClick={() => onConfirmFinding(f.id)}
              >
                {confirmLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
