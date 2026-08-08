import type { ScreeningCopy } from "./copy";
import {
  BRIEF_CRITERION_ORDER,
  briefRowLabel,
  presetBrief,
  type BriefPatch,
} from "./intake-script";
import { SCREENING_MAX_CANDIDATES } from "./constants";
import type {
  BriefCriterion,
  ScreeningBrief,
  ScreeningIntent,
  ScreeningRiskProfile,
} from "./schemas";

/**
 * The brief the user builds during intake. Kept in component state (and, for the
 * run page, sessionStorage) — stage E0 does not persist screening criteria
 * against the account, so there is no new personal data at rest.
 */
export type BriefState = {
  intent: ScreeningIntent;
  /** null = the user has not decided yet; [] = explicitly no restriction. */
  includeSectors: string[] | null;
  excludeSectors: string[] | null;
  regions: string[];
  candidateCount: number | null;
  criteria: Record<string, BriefCriterion>;
  endedEarly: boolean;
  /** null until answered; early exit defaults to "balanced". */
  riskProfile: ScreeningRiskProfile | null;
  focusTicker: string | null;
  focusExchange: string | null;
  focusCompanyName: string | null;
};

export function emptyBrief(intent: ScreeningIntent): BriefState {
  return {
    intent,
    includeSectors: intent === "analyze" ? [] : null,
    excludeSectors: intent === "analyze" ? [] : null,
    regions: [],
    candidateCount: intent === "analyze" ? 1 : null,
    criteria: {},
    endedEarly: false,
    riskProfile: null,
    focusTicker: null,
    focusExchange: null,
    focusCompanyName: null,
  };
}

export function applyPatch(state: BriefState, patch: BriefPatch): BriefState {
  const criteria = { ...state.criteria };
  for (const criterion of patch.criteria ?? []) {
    criteria[criterion.key] = criterion;
  }
  return {
    ...state,
    criteria,
    includeSectors: patch.includeSectors ?? state.includeSectors,
    excludeSectors: patch.excludeSectors ?? state.excludeSectors,
    regions: patch.regions ?? state.regions,
    candidateCount: patch.candidateCount ?? state.candidateCount,
    riskProfile: patch.riskProfile ?? state.riskProfile,
    focusTicker:
      patch.focusTicker !== undefined ? patch.focusTicker : state.focusTicker,
    focusExchange:
      patch.focusExchange !== undefined
        ? patch.focusExchange
        : state.focusExchange,
    focusCompanyName:
      patch.focusCompanyName !== undefined
        ? patch.focusCompanyName
        : state.focusCompanyName,
  };
}

/**
 * Fills whatever the user never answered with the saved preset, and reports what
 * was assumed so the chat can say it out loud instead of silently deciding.
 */
export function fillFromPreset(
  state: BriefState,
  copy: ScreeningCopy,
  defaults: { includeSectors: string[]; excludeSectors: string[]; candidateCount: number },
): { state: BriefState; filledLabels: string[] } {
  if (state.intent === "analyze") {
    const next: BriefState = {
      ...state,
      includeSectors: state.includeSectors ?? [],
      excludeSectors: state.excludeSectors ?? [],
      candidateCount: 1,
      endedEarly: true,
      riskProfile: state.riskProfile ?? "balanced",
    };
    const filledLabels: string[] = [];
    if (state.riskProfile === null) {
      filledLabels.push(copy.intake.fields.riskProfile);
    }
    return { state: next, filledLabels };
  }

  const patch = presetBrief(copy);
  const criteria = { ...state.criteria };
  const filledLabels: string[] = [];

  for (const criterion of patch.criteria ?? []) {
    if (!criteria[criterion.key]) {
      criteria[criterion.key] = criterion;
      filledLabels.push(briefRowLabel(copy, criterion.key));
    }
  }

  const next: BriefState = {
    ...state,
    criteria,
    regions: state.regions.length ? state.regions : (patch.regions ?? []),
    endedEarly: true,
    includeSectors: state.includeSectors,
    excludeSectors: state.excludeSectors,
    candidateCount: state.candidateCount,
    riskProfile: state.riskProfile,
  };

  if (next.includeSectors === null) {
    next.includeSectors = defaults.includeSectors;
    filledLabels.push(copy.intake.fields.includeSectors);
  }
  if (next.excludeSectors === null) {
    next.excludeSectors = defaults.excludeSectors;
    filledLabels.push(copy.intake.fields.excludeSectors);
  }
  if (next.candidateCount === null) {
    next.candidateCount = SCREENING_MAX_CANDIDATES;
    // Not listed in filledLabels — count is always fixed at 5, never a user choice.
  }
  if (next.riskProfile === null) {
    next.riskProfile = "balanced";
    filledLabels.push(copy.intake.fields.riskProfile);
  }

  return { state: next, filledLabels };
}

export type BriefRow = {
  key: string;
  label: string;
  condition: string;
  source: BriefCriterion["source"];
};

function riskProfileLabel(copy: ScreeningCopy, profile: ScreeningRiskProfile): string {
  if (profile === "conservative") return copy.intake.values.riskConservative;
  if (profile === "aggressive") return copy.intake.values.riskAggressive;
  return copy.intake.values.riskBalanced;
}

/** Rows in a stable order so the brief always reads the same way. */
export function buildBriefRows(state: BriefState, copy: ScreeningCopy): BriefRow[] {
  const rows: BriefRow[] = [];

  if (state.intent === "analyze") {
    if (state.focusCompanyName || state.focusTicker) {
      rows.push({
        key: "focusCompany",
        label: copy.intake.fields.focusCompany,
        condition: state.focusCompanyName || state.focusTicker || "—",
        source: "confirmed",
      });
    }
    if (state.focusTicker) {
      rows.push({
        key: "focusTicker",
        label: copy.intake.fields.focusTicker,
        condition: state.focusTicker,
        source: "confirmed",
      });
    }
    if (state.focusExchange) {
      rows.push({
        key: "focusExchange",
        label: copy.intake.fields.focusExchange,
        condition: state.focusExchange,
        source: "confirmed",
      });
    }
    if (state.riskProfile !== null) {
      rows.push({
        key: "riskProfile",
        label: copy.intake.fields.riskProfile,
        condition: riskProfileLabel(copy, state.riskProfile),
        source: state.endedEarly && state.riskProfile === "balanced" ? "preset" : "chat",
      });
    }
    return rows;
  }

  const sectorSource = state.intent === "rebalance" ? "rebalance" : "chat";

  if (state.includeSectors !== null) {
    rows.push({
      key: "includeSectors",
      label: copy.intake.fields.includeSectors,
      condition: state.includeSectors.length
        ? state.includeSectors.join(", ")
        : copy.intake.values.allSectors,
      source: sectorSource,
    });
  }
  if (state.excludeSectors !== null) {
    rows.push({
      key: "excludeSectors",
      label: copy.intake.fields.excludeSectors,
      condition: state.excludeSectors.length
        ? state.excludeSectors.join(", ")
        : copy.intake.values.none,
      source: sectorSource,
    });
  }

  for (const key of BRIEF_CRITERION_ORDER) {
    const criterion = state.criteria[key];
    if (!criterion) continue;
    rows.push({
      key,
      label: briefRowLabel(copy, key),
      condition: criterion.condition,
      source: criterion.source,
    });
  }

  // candidateCount is fixed at SCREENING_MAX_CANDIDATES — not shown as a user filter.

  if (state.riskProfile !== null) {
    rows.push({
      key: "riskProfile",
      label: copy.intake.fields.riskProfile,
      condition: riskProfileLabel(copy, state.riskProfile),
      source: state.endedEarly && state.riskProfile === "balanced" ? "preset" : "chat",
    });
  }

  return rows;
}

/** Payload for POST /api/screening/runs. */
export function toScreeningBrief(state: BriefState, locale: string): ScreeningBrief {
  if (state.intent === "analyze") {
    return {
      intent: "analyze",
      includeSectors: [],
      excludeSectors: [],
      regions: [],
      candidateCount: 1,
      criteria: [],
      endedEarly: state.endedEarly,
      locale,
      riskProfile: state.riskProfile,
      focusTicker: state.focusTicker,
      focusExchange: state.focusExchange,
      focusCompanyName: state.focusCompanyName,
    };
  }
  return {
    intent: state.intent,
    includeSectors: state.includeSectors ?? [],
    excludeSectors: state.excludeSectors ?? [],
    regions: state.regions,
    candidateCount: SCREENING_MAX_CANDIDATES,
    criteria: Object.values(state.criteria),
    endedEarly: state.endedEarly,
    locale,
    riskProfile: state.riskProfile,
    focusTicker: null,
    focusExchange: null,
    focusCompanyName: null,
  };
}

/**
 * Rebuild the client `BriefState` from a server-authoritative `ScreeningBrief`.
 * The Intake agent may explicitly return empty arrays for sector fields to
 * mean "no preference" — we preserve that instead of collapsing back to null.
 */
export function fromScreeningBrief(brief: ScreeningBrief): BriefState {
  const criteria: Record<string, BriefCriterion> = {};
  for (const c of brief.criteria) {
    criteria[c.key] = c;
  }
  return {
    intent: brief.intent,
    includeSectors: brief.includeSectors,
    excludeSectors: brief.excludeSectors,
    regions: brief.regions,
    candidateCount: brief.candidateCount,
    criteria,
    endedEarly: brief.endedEarly,
    riskProfile: brief.riskProfile ?? null,
    focusTicker: brief.focusTicker ?? null,
    focusExchange: brief.focusExchange ?? null,
    focusCompanyName: brief.focusCompanyName ?? null,
  };
}
