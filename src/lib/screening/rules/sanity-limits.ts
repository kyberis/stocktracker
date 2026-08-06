import type { ScreeningBrief, BriefCriterion } from "../schemas";

/**
 * Hard sanity limits applied to the brief after the Intake agent replies.
 *
 * The agent is instructed to stay within these ranges (see `prompts/intake.ts`)
 * but LLM output is untrusted: this file is the last line of defence before we
 * either accept the brief or return `rejected_infeasible` to the UI.
 *
 * Keep the rules narrow — we only reject obvious nonsense (negative multiples,
 * ROIC > 100%, etc.). Legitimate but unusual asks stay on the "ok" path.
 */

export type SanityIssue = { key: string; reason: string };

export interface SanityResult {
  ok: boolean;
  issues: SanityIssue[];
}

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;

function extractNumbers(condition: string): number[] {
  const out: number[] = [];
  for (const match of condition.matchAll(NUMBER_RE)) {
    const raw = match[0].replace(",", ".");
    const n = Number(raw);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

const PERCENTAGE_KEYS = new Set(["roic", "grossMargin", "ebitMargin", "revenueCagr"]);
const MULTIPLE_KEYS = new Set([
  "ndEbitda",
  "currentRatio",
  "fwdPe",
  "tevEbitda",
  "pFcf",
  "tevSales",
  "debtEquity",
]);

/** Per-key numeric bounds. `null` means "no constraint on that side". */
const KEY_BOUNDS: Record<string, { min: number | null; max: number | null }> = {
  roic: { min: -100, max: 100 },
  grossMargin: { min: -100, max: 100 },
  ebitMargin: { min: -100, max: 100 },
  revenueCagr: { min: -50, max: 200 },
  ndEbitda: { min: -20, max: 20 },
  currentRatio: { min: 0, max: 50 },
  fwdPe: { min: 0, max: 200 },
  tevEbitda: { min: 0, max: 200 },
  pFcf: { min: 0, max: 200 },
  tevSales: { min: 0, max: 100 },
  debtEquity: { min: 0, max: 500 },
  marketCap: { min: 0, max: 5_000_000 }, // millions USD
};

function checkCriterion(c: BriefCriterion): SanityIssue | null {
  const bounds = KEY_BOUNDS[c.key];
  if (!bounds) {
    // Unknown keys are not rejected here — the Zod schema will trim to the
    // allowed set; sanity-limits only guards known numeric bands.
    return null;
  }
  const numbers = extractNumbers(c.condition);
  if (numbers.length === 0) {
    // Text-only conditions (e.g. "US/Canada · Europe" for region) pass through.
    return null;
  }
  for (const n of numbers) {
    if (bounds.min !== null && n < bounds.min) {
      return { key: c.key, reason: `${c.key} value ${n} below minimum ${bounds.min}` };
    }
    if (bounds.max !== null && n > bounds.max) {
      return { key: c.key, reason: `${c.key} value ${n} above maximum ${bounds.max}` };
    }
  }
  return null;
}

/** Public: throws-free contract, returns `ok:false` with all issues collected. */
export function runSanityLimits(brief: ScreeningBrief): SanityResult {
  const issues: SanityIssue[] = [];

  if (brief.candidateCount < 3 || brief.candidateCount > 5) {
    issues.push({
      key: "candidateCount",
      reason: `candidateCount ${brief.candidateCount} must be between 3 and 5`,
    });
  }

  const seen = new Set<string>();
  for (const c of brief.criteria) {
    if (seen.has(c.key)) {
      issues.push({ key: c.key, reason: `duplicate criterion ${c.key}` });
      continue;
    }
    seen.add(c.key);
    const issue = checkCriterion(c);
    if (issue) issues.push(issue);
  }

  const includeSet = new Set(brief.includeSectors.map((s) => s.toLowerCase()));
  for (const excluded of brief.excludeSectors) {
    if (includeSet.has(excluded.toLowerCase())) {
      issues.push({
        key: "sectors",
        reason: `sector ${excluded} cannot be both included and excluded`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Diagnostic hint (exposed so the intake-agent can label percent vs multiple). */
export function isPercentageKey(key: string): boolean {
  return PERCENTAGE_KEYS.has(key);
}

export function isMultipleKey(key: string): boolean {
  return MULTIPLE_KEYS.has(key);
}
