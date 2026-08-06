import { REC_THRESHOLDS, pickUnderweightSectors } from "@/lib/homepage/build-portfolio-recommendations";

/**
 * Preview fixtures for the three entry-screen variants. Used only when
 * `?scenario=` is set so product can review copy without seeding portfolios.
 */
export type ScreeningEntryScenario = "empty" | "overexposed" | "balanced";

export type SectorPercent = { label: string; percent: number };

const OVEREXPOSURE_PCT = REC_THRESHOLDS.topSectorPct;

/** Technology dominates — triggers the overexposure path. */
export const PREVIEW_OVEREXPOSED_SECTORS: SectorPercent[] = [
  { label: "Technology", percent: 48.2 },
  { label: "Financials", percent: 16.4 },
  { label: "Healthcare", percent: 11.1 },
  { label: "Industrials", percent: 9.3 },
  { label: "Consumer Discretionary", percent: 7.8 },
  { label: "Communication Services", percent: 4.6 },
  { label: "Utilities", percent: 2.6 },
];

/** No sector ≥ 35% — balanced path with exploration as primary CTA. */
export const PREVIEW_BALANCED_SECTORS: SectorPercent[] = [
  { label: "Technology", percent: 22.0 },
  { label: "Healthcare", percent: 18.4 },
  { label: "Financials", percent: 15.8 },
  { label: "Industrials", percent: 13.2 },
  { label: "Consumer Discretionary", percent: 11.1 },
  { label: "Communication Services", percent: 9.5 },
  { label: "Utilities", percent: 6.0 },
  { label: "Energy", percent: 4.0 },
];

export function isScreeningEntryScenario(value: string | null | undefined): value is ScreeningEntryScenario {
  return value === "empty" || value === "overexposed" || value === "balanced";
}

export function resolvePreviewAllocation(scenario: ScreeningEntryScenario): {
  sectors: SectorPercent[];
  overexposed: SectorPercent | null;
  underweight: Array<{ label: string; pct: number }>;
} {
  if (scenario === "empty") {
    return { sectors: [], overexposed: null, underweight: [] };
  }

  const sectors =
    scenario === "overexposed" ? PREVIEW_OVEREXPOSED_SECTORS : PREVIEW_BALANCED_SECTORS;
  const top = sectors[0] ?? null;
  const overexposed =
    top != null && top.percent >= OVEREXPOSURE_PCT ? top : null;

  return {
    sectors,
    overexposed,
    underweight: pickUnderweightSectors(sectors, 2),
  };
}
