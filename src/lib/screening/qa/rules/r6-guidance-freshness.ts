import {
  classifyGuidanceAsOf,
  parseGuidanceAsOf,
} from "@/lib/screening/qa/guidance-asof";
import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

export { parseGuidanceAsOf };

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

    for (const row of tickers) {
      const asOfRaw = row.guidance?.asOf ?? null;
      if (!asOfRaw) continue;
      // "No recent guidance" with a placeholder asOf still counts — the date
      // is what the report may surface.
      const freshness = classifyGuidanceAsOf(asOfRaw, now);
      if (freshness === "unparseable") {
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

      if (freshness === "stale") {
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
      if (freshness === "future") {
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
