/**
 * Semantic color classes for allocation drift (TRF-005 / TRF-011 prep).
 * Over-target (positive drift) = problem → red; under-target → green; near target → muted.
 */

export type DriftTone = "over" | "under" | "neutral";

export function driftTone(driftPercent: number, threshold = 2): DriftTone {
  if (Math.abs(driftPercent) < threshold) return "neutral";
  return driftPercent > 0 ? "over" : "under";
}

/** Tailwind text classes for drift percentages / labels. */
export function driftToneTextClass(tone: DriftTone): string {
  switch (tone) {
    case "over":
      return "text-[color:var(--over-target,#ef4444)] text-red-500 dark:text-red-400";
    case "under":
      return "text-[color:var(--under-target,#10b981)] text-emerald-600 dark:text-emerald-400";
    default:
      return "text-[color:var(--neutral,#64748b)] text-gray-500 dark:text-slate-400";
  }
}

export function driftToneDotClass(tone: DriftTone): string {
  switch (tone) {
    case "over":
      return "bg-[color:var(--over-target,#ef4444)]";
    case "under":
      return "bg-[color:var(--under-target,#10b981)]";
    default:
      return "bg-[color:var(--neutral,#64748b)]";
  }
}
