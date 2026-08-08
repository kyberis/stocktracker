import type {
  BriefCriterion,
  HardDataCandidate,
  ScreeningBrief,
} from "@/lib/screening/schemas";
import { marketCapRangeFromCondition } from "@/lib/screening/data/fmp-screening";

export type BriefCriterionEval = {
  key: string;
  condition: string;
  met: boolean | null;
  /** Human-readable expectation that was not met (only when met === false). */
  unmetLabel: string | null;
};

export type BriefFitSummary = {
  totalEvaluable: number;
  metCount: number;
  /** True when metCount >= ceil(totalEvaluable / 2). Empty brief → majority. */
  meetsMajority: boolean;
  unmet: Array<{ key: string; condition: string; label: string }>;
};

type MetricBag = {
  marketCapUsd: number | null;
  fwdPe: number | null;
  evEbitda: number | null;
  ndEbitda: number | null;
  // Optional extras when enrichment has them later
  [key: string]: number | null | undefined;
};

/**
 * Parse inequalities like "< 15x", "> 12%", "<= 2.5x".
 * Returns null when the condition is not a simple comparison.
 */
export function parseNumericCondition(
  condition: string,
): { op: "<" | "<=" | ">" | ">="; value: number } | null {
  if (!condition) return null;
  const cleaned = condition
    .replace(/,/g, "")
    .replace(/–/g, "-")
    .trim()
    .toLowerCase();
  const m = cleaned.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)\s*[x%]?/);
  if (!m) return null;
  const op = m[1] as "<" | "<=" | ">" | ">=";
  const value = Number(m[2]);
  if (!Number.isFinite(value)) return null;
  return { op, value };
}

function compare(actual: number, op: "<" | "<=" | ">" | ">=", expected: number): boolean {
  switch (op) {
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
  }
}

function metricForKey(key: string, metrics: MetricBag): number | null {
  switch (key) {
    case "marketCap":
      return metrics.marketCapUsd ?? null;
    case "fwdPe":
      return metrics.fwdPe ?? null;
    case "tevEbitda":
      return metrics.evEbitda ?? null;
    case "ndEbitda":
      return metrics.ndEbitda ?? null;
    default:
      return null;
  }
}

function evaluateOne(
  criterion: BriefCriterion,
  metrics: MetricBag,
): BriefCriterionEval {
  const { key, condition } = criterion;
  if (key === "marketCap") {
    const range = marketCapRangeFromCondition(condition);
    const cap = metrics.marketCapUsd;
    if (cap == null || (range.min == null && range.max == null)) {
      return { key, condition, met: null, unmetLabel: null };
    }
    const aboveMin = range.min == null || cap >= range.min;
    const belowMax = range.max == null || cap <= range.max;
    const met = aboveMin && belowMax;
    return {
      key,
      condition,
      met,
      unmetLabel: met ? null : `Market cap outside ${condition}`,
    };
  }

  if (key === "region") {
    // Region is enforced upstream by the FMP country filter — treat as met when present.
    return { key, condition, met: true, unmetLabel: null };
  }

  const parsed = parseNumericCondition(condition);
  const actual = metricForKey(key, metrics);
  if (!parsed || actual == null) {
    return { key, condition, met: null, unmetLabel: null };
  }
  const met = compare(actual, parsed.op, parsed.value);
  return {
    key,
    condition,
    met,
    unmetLabel: met ? null : `${key} ${condition} (actual ${formatActual(key, actual)})`,
  };
}

function formatActual(key: string, value: number): string {
  if (key === "marketCap") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    return String(Math.round(value));
  }
  if (key === "fwdPe" || key === "tevEbitda" || key === "ndEbitda") {
    return `${value.toFixed(1)}x`;
  }
  return value.toFixed(1);
}

export function evaluateBriefFit(
  brief: ScreeningBrief,
  metrics: MetricBag,
): BriefFitSummary {
  const evals = (brief.criteria ?? []).map((c) => evaluateOne(c, metrics));
  const evaluable = evals.filter((e) => e.met !== null);
  const metCount = evaluable.filter((e) => e.met === true).length;
  const totalEvaluable = evaluable.length;
  const unmet = evals
    .filter((e) => e.met === false && e.unmetLabel)
    .map((e) => ({
      key: e.key,
      condition: e.condition,
      label: e.unmetLabel!,
    }));
  const meetsMajority =
    totalEvaluable === 0 ? true : metCount >= Math.ceil(totalEvaluable / 2);
  return { totalEvaluable, metCount, meetsMajority, unmet };
}

/** Attach brief-fit fields onto enriched Hard Data candidates. */
export function applyBriefFitToCandidates(
  brief: ScreeningBrief,
  candidates: HardDataCandidate[],
): HardDataCandidate[] {
  return candidates.map((c) => {
    const fit = evaluateBriefFit(brief, {
      marketCapUsd: c.marketCapUsd ?? null,
      fwdPe: c.fwdPe ?? null,
      evEbitda: c.evEbitda ?? null,
      ndEbitda: c.ndEbitda ?? null,
    });
    return {
      ...c,
      briefCriteriaTotal: fit.totalEvaluable,
      briefCriteriaMet: fit.metCount,
      meetsMajorityBrief: fit.meetsMajority,
      unmetBriefCriteria: fit.unmet.map((u) => u.label).slice(0, 8),
    };
  });
}
