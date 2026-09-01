export const SCREENING_PIPELINE_KINDS = ["checklist", "thesis"] as const;
export type ScreeningPipelineKind = (typeof SCREENING_PIPELINE_KINDS)[number];

export const DEFAULT_SCREENING_PIPELINE_KIND: ScreeningPipelineKind = "checklist";

export function parseScreeningPipelineKind(
  raw: unknown,
): ScreeningPipelineKind {
  return raw === "thesis" ? "thesis" : "checklist";
}

/**
 * Server-side resolution: thesis only when the user asked for it, the feature
 * flag is on, **and** the intent is Analyze (“Profundizar en una empresa”).
 * Explore / rebalance always stay on checklist.
 */
export function resolveScreeningPipelineKind(opts: {
  requested: unknown;
  thesisEnabled: boolean;
  intent?: string | null;
}): ScreeningPipelineKind {
  if (!opts.thesisEnabled) return "checklist";
  if (opts.intent != null && opts.intent !== "analyze") return "checklist";
  return parseScreeningPipelineKind(opts.requested);
}

export function isThesisPipelineKind(
  kind: ScreeningPipelineKind | string | null | undefined,
): boolean {
  return kind === "thesis";
}

/** Analyze + thesis flag → thesis; everything else → checklist. */
export function pipelineKindForIntent(opts: {
  intent: string | null | undefined;
  thesisEnabled: boolean;
}): ScreeningPipelineKind {
  if (opts.thesisEnabled && opts.intent === "analyze") return "thesis";
  return "checklist";
}
