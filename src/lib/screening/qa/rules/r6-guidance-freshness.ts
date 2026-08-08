import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 365;
/** Tolerate small clock skew / same-day filings labelled tomorrow. */
const FUTURE_SLACK_DAYS = 2;

/**
 * Parse `YYYY-MM-DD` / `YYYY-MM` / ISO timestamps into a Date at UTC midnight.
 * Returns null when the string is not a usable date.
 */
export function parseGuidanceAsOf(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Prefer explicit calendar forms so "2026-07" means July 1, not local parse quirks.
  const ym = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, 1));
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return null;
  const dt = new Date(t);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function utcToday(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * R6 — Guidance freshness (deterministic).
 *
 * `guidance.asOf` must be within the last 12 months and not meaningfully in
 * the future. Stale or absurd future dates are blocking so IR can correct or
 * clear the claim on retry.
 */
export function r6GuidanceFreshness(now: Date = new Date()): QaRule {
  return (ctx) => {
    const issues: QaIssue[] = [];
    const tickers = ctx.irAggregate?.tickers ?? [];
    const today = utcToday(now);

    for (const row of tickers) {
      const asOfRaw = row.guidance?.asOf ?? null;
      if (!asOfRaw) continue;
      // "No recent guidance" with a placeholder asOf still counts — the date
      // is what the report may surface.
      const asOf = parseGuidanceAsOf(asOfRaw);
      if (!asOf) {
        issues.push({
          issueType: "unconfirmed_source",
          ruleId: "R6",
          agentKind: "ir_business",
          ticker: row.ticker,
          claimPath: "guidance.asOf",
          expectedValue: "parseable YYYY-MM-DD within last 12 months",
          actualValue: asOfRaw,
          summary: `Guidance asOf "${asOfRaw}" is not a parseable date.`,
          blocking: true,
        });
        continue;
      }

      const ageDays = (today.getTime() - asOf.getTime()) / MS_PER_DAY;
      if (ageDays > MAX_AGE_DAYS) {
        issues.push({
          issueType: "unconfirmed_source",
          ruleId: "R6",
          agentKind: "ir_business",
          ticker: row.ticker,
          claimPath: "guidance.asOf",
          expectedValue: "within the last 12 months",
          actualValue: asOfRaw,
          summary: `Guidance asOf ${asOfRaw} is older than 12 months.`,
          blocking: true,
        });
        continue;
      }
      if (ageDays < -FUTURE_SLACK_DAYS) {
        issues.push({
          issueType: "unconfirmed_source",
          ruleId: "R6",
          agentKind: "ir_business",
          ticker: row.ticker,
          claimPath: "guidance.asOf",
          expectedValue: "not in the future",
          actualValue: asOfRaw,
          summary: `Guidance asOf ${asOfRaw} is in the future relative to today.`,
          blocking: true,
        });
      }
    }
    return issues;
  };
}

/** Default export used by the deterministic runner (clock = now). */
export const r6GuidanceFreshnessRule: QaRule = r6GuidanceFreshness();
