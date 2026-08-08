import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

/**
 * R10 — Analyst / guidance source coverage.
 *
 * A card that displays `targetPrice` (which flows from Hard Data's price
 * target, itself sourced from FMP price-target consensus) must have at least
 * one source in `sources[]` whose `field` mentions "guidance" or "analyst" —
 * otherwise the report is asserting a target without exposing the source.
 */
export const r10AnalystCount: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const report = ctx.report;
  if (!report) return issues;

  for (const card of report.cards) {
    if (card.targetPrice == null) continue;
    const anySource = card.sources.some((s) => {
      const f = (s.field ?? "").toLowerCase();
      return f.includes("guidance") || f.includes("analyst");
    });
    if (!anySource) {
      issues.push({
        issueType: "unconfirmed_source",
        ruleId: "R10",
        agentKind: "compiler",
        ticker: card.ticker,
        claimPath: "targetPrice",
        expectedValue: "≥1 source field 'guidance' or 'analyst'",
        actualValue: `${card.sources.length} sources, none analyst/guidance`,
        summary:
          "Card shows a price target but no source is labelled guidance/analyst.",
        // Not blocking in Phase 1 — the target is provider-sourced even when
        // the compiler failed to attach a guidance URL. We surface it as a
        // warning instead so admins can tune source labelling.
        blocking: false,
      });
    }
  }
  return issues;
};
