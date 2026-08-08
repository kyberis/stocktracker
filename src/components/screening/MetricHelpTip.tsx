"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fill, type ScreeningCopy } from "@/lib/screening/copy";
import { useScreeningCopy } from "./use-screening-copy";

export type RowHelp = ScreeningCopy["intake"]["rowHelp"][keyof ScreeningCopy["intake"]["rowHelp"]];

/** Click/keyboard tip for a brief metric: what it is + higher/lower meaning. */
export function MetricHelpTip({
  label,
  help,
  className = "",
}: {
  label: string;
  help: RowHelp | undefined;
  className?: string;
}) {
  const { copy } = useScreeningCopy();
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!help) {
    return <span className={`min-w-0 truncate ${className}`}>{label}</span>;
  }

  return (
    <span ref={rootRef} className={`relative inline-flex min-w-0 max-w-full items-center gap-1 ${className}`}>
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-teal-500/10 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-teal-300"
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={fill(copy.intake.rowHelpAria, { label })}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {open ? (
        <div
          id={tipId}
          role="tooltip"
          className="glass-overlay absolute left-0 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[color:var(--border)] p-2.5 text-left shadow-lg"
        >
          <p className="text-[12px] leading-relaxed text-[color:var(--foreground)]">{help.what}</p>
          {"higher" in help && help.higher ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">{copy.intake.guideHigher}: </span>
              {help.higher}
            </p>
          ) : null}
          {"lower" in help && help.lower ? (
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">{copy.intake.guideLower}: </span>
              {help.lower}
            </p>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

export function ExplainHelpList({
  entries,
}: {
  entries: ReadonlyArray<{ term: string; def: string; higher?: string; lower?: string }>;
}) {
  const { copy } = useScreeningCopy();
  if (!entries.length) return null;
  return (
    <dl className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.term}>
          <dt className="text-[12px] font-semibold text-[color:var(--foreground)]">{entry.term}</dt>
          <dd className="text-[12px] leading-relaxed text-[color:var(--muted)]">{entry.def}</dd>
          {entry.higher ? (
            <dd className="mt-1 text-[11px] leading-relaxed text-[color:var(--muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">{copy.intake.guideHigher}: </span>
              {entry.higher}
            </dd>
          ) : null}
          {entry.lower ? (
            <dd className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">{copy.intake.guideLower}: </span>
              {entry.lower}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
