import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

/**
 * R4 — P/E history integrity.
 *
 * Card `multiples.fwdPe` and `multiples.ownHistPe` must round-trip to the same
 * values stored in Hard Data (±10%). If the compiler invented a number that
 * disagrees with Hard Data, this is a `quant_mismatch`.
 *
 * We also assert that when `earningsResilient` was scored positively, the
 * multi-year revenue growth history actually has data.
 */
export const r4PeHistory: QaRule = (ctx) => {
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

    const checks: Array<{
      path: string;
      cardValue: number | null | undefined;
      hardValue: number | null | undefined;
    }> = [
      { path: "multiples.fwdPe", cardValue: card.multiples.fwdPe, hardValue: hd.fwdPe },
      {
        path: "multiples.ownHistPe",
        cardValue: card.multiples.ownHistPe,
        hardValue: hd.ownHistPe,
      },
      {
        path: "multiples.evEbitda",
        cardValue: card.multiples.evEbitda,
        hardValue: hd.evEbitda,
      },
      {
        path: "multiples.ndEbitda",
        cardValue: card.multiples.ndEbitda,
        hardValue: hd.ndEbitda,
      },
    ];

    for (const { path, cardValue, hardValue } of checks) {
      if (cardValue == null || hardValue == null) continue;
      const denom = Math.max(1e-6, Math.abs(hardValue));
      const drift = Math.abs(cardValue - hardValue) / denom;
      if (drift > 0.1) {
        issues.push({
          issueType: "quant_mismatch",
          ruleId: "R4",
          agentKind: "compiler",
          ticker: card.ticker,
          claimPath: path,
          expectedValue: hardValue.toFixed(3),
          actualValue: cardValue.toFixed(3),
          summary: `Card ${path} drifts >10% from Hard Data.`,
          blocking: true,
        });
      }
    }

    if (hd.earningsResilient === true) {
      const hist = hd.revenueGrowthHistoryPct;
      if (!hist || hist.length < 3) {
        issues.push({
          issueType: "rule_violation",
          ruleId: "R4",
          agentKind: "hard_data",
          ticker: card.ticker,
          claimPath: "earningsResilient",
          expectedValue: "≥3 years of revenue-growth history",
          actualValue: `${hist?.length ?? 0} years`,
          summary:
            "Earnings resilience flagged true without sufficient multi-year revenue-growth history.",
          blocking: true,
        });
      }
    }
  }
  return issues;
};
