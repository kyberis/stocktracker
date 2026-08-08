import type { ScreeningBrief, ScreeningIntent } from "./schemas";

/**
 * Build the intake URL so Back from the run/report returns to the agent with
 * the same intent and sector hints the user started from.
 */
export function buildIntakeHref(opts: {
  intent?: ScreeningIntent | string | null;
  includeSectors?: string[] | null;
  excludeSectors?: string[] | null;
}): string {
  const search = new URLSearchParams();
  const intent =
    opts.intent === "rebalance" ||
    opts.intent === "explore" ||
    opts.intent === "analyze"
      ? opts.intent
      : "explore";
  search.set("intent", intent);
  const include = (opts.includeSectors ?? []).filter(Boolean).slice(0, 5);
  const exclude = (opts.excludeSectors ?? []).filter(Boolean).slice(0, 5);
  if (include.length) search.set("include", include.join(","));
  if (exclude.length) search.set("exclude", exclude.join(","));
  return `/screening/intake?${search.toString()}`;
}

export function buildIntakeHrefFromBrief(brief: ScreeningBrief | null | undefined): string {
  if (!brief) return "/screening/intake";
  return buildIntakeHref({
    intent: brief.intent,
    includeSectors: brief.includeSectors,
    excludeSectors: brief.excludeSectors,
  });
}

export const SCREENING_INTAKE_RETURN_KEY = (runId: string) =>
  `trefolio-screening-intake-return-${runId}`;
