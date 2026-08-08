import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

/**
 * R9 — Peer filtering / sector-country integrity.
 *
 * The sector and country a card advertises must match the raw Hard Data. This
 * catches Compiler prose drift (e.g. the model rewriting "United States" as
 * "Global" or moving a stock to a different sector).
 */
export const r9PeerFiltering: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const report = ctx.report;
  const hardData = ctx.hardData;
  if (!report || !hardData) return issues;

  const hardByTicker = new Map(
    hardData.candidates.map((c) => [c.ticker.toUpperCase(), c]),
  );

  for (const card of report.cards) {
    const hd = hardByTicker.get(card.ticker.toUpperCase());
    if (!hd) continue;

    if (hd.sector && card.sector !== "—") {
      if (!eqTrim(card.sector, hd.sector)) {
        issues.push({
          issueType: "cross_agent_inconsistency",
          ruleId: "R9",
          agentKind: "compiler",
          ticker: card.ticker,
          claimPath: "sector",
          expectedValue: hd.sector,
          actualValue: card.sector,
          summary: "Card sector does not match Hard Data sector.",
          blocking: true,
        });
      }
    }

    if (hd.country && card.country !== "—") {
      if (!eqTrim(card.country, hd.country)) {
        issues.push({
          issueType: "cross_agent_inconsistency",
          ruleId: "R9",
          agentKind: "compiler",
          ticker: card.ticker,
          claimPath: "country",
          expectedValue: hd.country,
          actualValue: card.country,
          summary: "Card country does not match Hard Data country.",
          blocking: false,
        });
      }
    }
  }
  return issues;
};

function eqTrim(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
