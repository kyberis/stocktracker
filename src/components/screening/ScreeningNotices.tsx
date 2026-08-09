"use client";

import { useScreeningCopy } from "./use-screening-copy";

/**
 * Legal + honesty chrome. Every screening screen shows the financial disclaimer.
 */

export function ScreeningDisclaimer({ className = "" }: { className?: string }) {
  const { copy } = useScreeningCopy();
  return (
    <p className={`text-[11px] text-[color:var(--muted)] ${className}`.trim()} role="note">
      {copy.common.disclaimerShort}
    </p>
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
