"use client";

import { formatAnalysisNumber } from "@/lib/company-analysis/format";

export function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color:var(--surface-soft)] ${className}`}
      aria-hidden
    />
  );
}

export function StatCard({
  label,
  value,
  sub,
  noSnippet,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Exclude volatile figures (e.g. live price) from search snippets. */
  noSnippet?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
      {...(noSnippet ? { "data-nosnippet": true } : {})}
    >
      <div className="text-[11px] uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">{value}</div>
      {sub != null && <div className="mt-0.5 text-xs text-[color:var(--muted)]">{sub}</div>}
    </div>
  );
}

export function Yoy({ value, language }: { value: number | null; language: string }) {
  if (value == null) {
    return <span className="text-[color:var(--muted)]">—</span>;
  }
  const formatted = formatAnalysisNumber(value, language, { digits: 1 });
  const cls =
    value >= 0
      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
      : "text-red-500 dark:text-red-400 font-semibold";
  return <span className={cls}>{formatted}%</span>;
}

export function InsiderTag({ tag, label }: { tag: string; label: string }) {
  if (tag === "tag-buy") {
    return (
      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        {label}
      </span>
    );
  }
  if (tag === "tag-sell") {
    return (
      <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase text-red-600 dark:bg-red-500/10 dark:text-red-400">
        {label}
      </span>
    );
  }
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold uppercase text-gray-600 dark:bg-slate-500/10 dark:text-slate-400">
      {label}
    </span>
  );
}

export function NarrativeBodySkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-11/12" />
      <Pulse className="h-4 w-4/5" />
    </div>
  );
}

export function PanelLoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <p className="sr-only">{label}</p>
      <div className="card space-y-3 p-4">
        <Pulse className="h-6 w-32" />
        <Pulse className="h-56 w-full rounded-[16px]" />
      </div>
      <div className="card space-y-3 p-6">
        <Pulse className="h-6 w-40" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-5/6" />
        <Pulse className="h-4 w-2/3" />
      </div>
    </div>
  );
}
