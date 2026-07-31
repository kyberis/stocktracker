/**
 * Visibility helpers for company-analysis empty-state UX.
 * Optional fields are omitted when null — never shown as "Data unavailable".
 */

export interface NextQuarterRowFlags {
  showGuidance: boolean;
  showConsensusRevenue: boolean;
  showConsensusEps: boolean;
  showCard: boolean;
}

export function nextQuarterRowFlags(fundamentals: {
  companyGuidanceRevenue: number | null;
  consensusRevenue: number | null;
  consensusEps: number | null;
}): NextQuarterRowFlags {
  const showGuidance = fundamentals.companyGuidanceRevenue != null;
  const showConsensusRevenue = fundamentals.consensusRevenue != null;
  const showConsensusEps = fundamentals.consensusEps != null;
  return {
    showGuidance,
    showConsensusRevenue,
    showConsensusEps,
    showCard: showGuidance || showConsensusRevenue || showConsensusEps,
  };
}

/** After narrative settles, omit AI-only sections with no text. */
export function shouldShowNarrativeSection(
  pending: boolean,
  ...texts: Array<string | null | undefined>
): boolean {
  if (pending) return true;
  return texts.some((t) => Boolean(t?.trim()));
}
