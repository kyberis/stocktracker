/**
 * Three independent category assessments for screening cards.
 *
 * Replaces the headline score/8 + fuerte/watch verdict. A name can be solid
 * and a good portfolio fit while still expensive (no margin of safety).
 */

export type CheapLabel = "cheap" | "fair" | "expensive" | "unknown";
export type FitLabel = "fit" | "stretch" | "poor_fit" | "unknown";
export type SolidityLabel = "solid" | "moderate" | "weak" | "unknown";
export type HistPeSource = "multi_year" | "ttm" | "none";

export interface CategoryScoreInputs {
  fwdPe: number | null;
  ownHistPe: number | null;
  normalizedPe?: number | null;
  /** Mean annual PE over recent fiscal years (when available). */
  histPeAvg?: number | null;
  /** How many annual PE observations backed histPeAvg. */
  histPeYears?: number | null;
  earningsQualitySuspect?: boolean | null;
  moatScorePct: number | null;
  suitability?: "fit" | "stretch" | "poor_fit" | null;
}

export interface CheapCategory {
  label: CheapLabel;
  currentPe: number | null;
  histPe: number | null;
  histPeSource: HistPeSource;
}

export interface FitCategory {
  label: FitLabel;
}

export interface SolidityCategory {
  label: SolidityLabel;
  moatScore: number | null;
}

export interface CategoryScores {
  cheap: CheapCategory;
  fit: FitCategory;
  solidity: SolidityCategory;
}

/** Absolute bands when history is missing (aligned with Moat screener chips). */
const ABS_CHEAP_MAX = 15;
const ABS_FAIR_MAX = 25;

/** Relative band vs historical PE (±15%). */
const REL_BAND = 0.15;

/**
 * Select the PE used as "current" for cheapness — same preference as criterion 1.
 */
export function selectCurrentPe(input: {
  fwdPe: number | null;
  ownHistPe: number | null;
  normalizedPe?: number | null;
  earningsQualitySuspect?: boolean | null;
}): number | null {
  const suspect = input.earningsQualitySuspect === true;
  if (suspect) {
    return input.normalizedPe ?? input.fwdPe ?? null;
  }
  return input.fwdPe ?? input.ownHistPe ?? input.normalizedPe ?? null;
}

function resolveHistPe(input: CategoryScoreInputs): {
  histPe: number | null;
  histPeSource: HistPeSource;
} {
  const years = input.histPeYears ?? 0;
  const avg = input.histPeAvg;
  if (avg != null && avg > 0 && years >= 3) {
    return { histPe: avg, histPeSource: "multi_year" };
  }
  if (input.ownHistPe != null && input.ownHistPe > 0) {
    return { histPe: input.ownHistPe, histPeSource: "ttm" };
  }
  if (avg != null && avg > 0) {
    return { histPe: avg, histPeSource: "multi_year" };
  }
  return { histPe: null, histPeSource: "none" };
}

/**
 * Cheap? — Barata / Precio justo / Cara from current vs historical PE.
 *
 * When multi-year (or TTM) history exists, relative valuation leads; absolute
 * bands break ties and cover missing history. Never labels `cheap` on a
 * depressed TTM-only multiple when earnings quality is suspect.
 */
export function scoreCheap(input: CategoryScoreInputs): CheapCategory {
  const currentPe = selectCurrentPe(input);
  const { histPe, histPeSource } = resolveHistPe(input);
  const suspect = input.earningsQualitySuspect === true;

  if (
    suspect &&
    currentPe == null &&
    input.ownHistPe != null &&
    input.ownHistPe > 0 &&
    input.ownHistPe < ABS_CHEAP_MAX
  ) {
    return {
      label: "expensive",
      currentPe: input.ownHistPe,
      histPe,
      histPeSource,
    };
  }

  if (currentPe == null || !(currentPe > 0)) {
    return { label: "unknown", currentPe: null, histPe, histPeSource };
  }

  if (histPe != null && histPe > 0) {
    const ratio = currentPe / histPe;
    // Extreme absolute premium always expensive (no margin of safety).
    if (currentPe >= ABS_FAIR_MAX || ratio > 1 + REL_BAND) {
      return { label: "expensive", currentPe, histPe, histPeSource };
    }
    // Discount to history, or absolute cheap without premium vs history.
    if (ratio < 1 - REL_BAND || currentPe < ABS_CHEAP_MAX) {
      return { label: "cheap", currentPe, histPe, histPeSource };
    }
    return { label: "fair", currentPe, histPe, histPeSource };
  }

  if (currentPe < ABS_CHEAP_MAX) {
    return { label: "cheap", currentPe, histPe, histPeSource };
  }
  if (currentPe < ABS_FAIR_MAX) {
    return { label: "fair", currentPe, histPe, histPeSource };
  }
  return { label: "expensive", currentPe, histPe, histPeSource };
}

export function scoreFit(
  suitability: "fit" | "stretch" | "poor_fit" | null | undefined,
): FitCategory {
  if (suitability == null) return { label: "unknown" };
  return { label: suitability };
}

/**
 * Solidity from cached Moat % (same bands as the Moat product verdict).
 * ≥70 solid, ≥50 moderate, else weak when a score exists.
 */
export function scoreSolidity(moatScorePct: number | null): SolidityCategory {
  if (moatScorePct == null || !Number.isFinite(moatScorePct)) {
    return { label: "unknown", moatScore: null };
  }
  if (moatScorePct >= 70) return { label: "solid", moatScore: moatScorePct };
  if (moatScorePct >= 50) return { label: "moderate", moatScore: moatScorePct };
  return { label: "weak", moatScore: moatScorePct };
}

export function scoreCategories(input: CategoryScoreInputs): CategoryScores {
  return {
    cheap: scoreCheap(input),
    fit: scoreFit(input.suitability),
    solidity: scoreSolidity(input.moatScorePct),
  };
}
