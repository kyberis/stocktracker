"use client";

import { useScreeningCopy } from "./use-screening-copy";

/**
 * Legal + honesty chrome. Every screening screen shows the financial disclaimer,
 * and every screen driven by fixtures says so — a user must never mistake the
 * example report for real research on their portfolio.
 */

export function ScreeningDisclaimer({ className = "" }: { className?: string }) {
  const { copy } = useScreeningCopy();
  return (
    <p className={`text-[11px] text-[color:var(--muted)] ${className}`.trim()} role="note">
      {copy.common.disclaimerShort}
    </p>
  );
}

export function MockNotice({ className = "" }: { className?: string }) {
  const { copy } = useScreeningCopy();
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 ${className}`.trim()}
      role="status"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
        {copy.common.mockBadge}
      </p>
      <p className="mt-1 text-xs text-[color:var(--foreground)]">{copy.common.mockNotice}</p>
    </div>
  );
}

export function AiLabel({ className = "" }: { className?: string }) {
  const { copy } = useScreeningCopy();
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--muted)] ${className}`.trim()}
    >
      {copy.common.aiLabel}
    </span>
  );
}
