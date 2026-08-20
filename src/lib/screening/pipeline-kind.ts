export const SCREENING_PIPELINE_KINDS = ["checklist", "thesis"] as const;
export type ScreeningPipelineKind = (typeof SCREENING_PIPELINE_KINDS)[number];

export const DEFAULT_SCREENING_PIPELINE_KIND: ScreeningPipelineKind = "checklist";

export function parseScreeningPipelineKind(
  raw: unknown,
): ScreeningPipelineKind {
  return raw === "thesis" ? "thesis" : "checklist";
}

/**
 * Server-side resolution: thesis only when the user asked for it AND the
 * feature flag is on. Otherwise always checklist.
 */
export function resolveScreeningPipelineKind(opts: {
  requested: unknown;
  thesisEnabled: boolean;
}): ScreeningPipelineKind {
  if (!opts.thesisEnabled) return "checklist";
  return parseScreeningPipelineKind(opts.requested);
}

export function isThesisPipelineKind(
  kind: ScreeningPipelineKind | string | null | undefined,
): boolean {
  return kind === "thesis";
}
