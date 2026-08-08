import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

/**
 * Generic quantitative mismatch: every cited field on a card must resolve to
 * a non-null value we can find in Hard Data, IR, Web, or Portfolio Context.
 * If the compiler cited a field but the underlying agent output is null, the
 * card is quoting phantom data.
 */
export const quantMismatch: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const report = ctx.report;
  if (!report) return issues;

  const hardByTicker = new Map(
    (ctx.hardData?.candidates ?? []).map((c) => [c.ticker.toUpperCase(), c]),
  );
  const irByTicker = new Map(
    (ctx.irAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );
  const webByTicker = new Map(
    (ctx.webAggregate?.tickers ?? []).map((t) => [t.ticker.toUpperCase(), t]),
  );

  for (const card of report.cards) {
    const cited = card.citedFields ?? [];
    if (cited.length === 0) continue;
    const hd = hardByTicker.get(card.ticker.toUpperCase());
    const ir = irByTicker.get(card.ticker.toUpperCase());
    const web = webByTicker.get(card.ticker.toUpperCase());

    for (const field of cited) {
      if (!isFieldSupported(field, { card, hd, ir, web })) {
        issues.push({
          issueType: "quant_mismatch",
          ruleId: null,
          agentKind: "compiler",
          ticker: card.ticker,
          claimPath: `citedFields[${field}]`,
          expectedValue: "non-null value in upstream agent output",
          actualValue: "null",
          summary: `Cited field '${field}' is not backed by any upstream agent output.`,
          blocking: false,
        });
      }
    }
  }
  return issues;
};

function isFieldSupported(
  field: string,
  refs: {
    card: import("@/lib/screening/schemas").ScreeningCandidateCard;
    hd: import("@/lib/screening/schemas").HardDataOutput["candidates"][number] | undefined;
    ir: import("@/lib/screening/schemas").IrBusinessOutput | undefined;
    web: import("@/lib/screening/schemas").WebSentimentOutput | undefined;
  },
): boolean {
  const { card, hd, ir, web } = refs;
  switch (field) {
    case "multiples.fwdPe":
      return card.multiples.fwdPe != null || hd?.fwdPe != null;
    case "multiples.evEbitda":
      return card.multiples.evEbitda != null || hd?.evEbitda != null;
    case "flags.moatScore":
      return card.flags.moatScore != null || hd?.moatScore != null;
    case "targetPrice":
      return card.targetPrice != null || hd?.targetPrice != null;
    case "businessOneLiner":
      return Boolean(card.businessOneLiner || ir?.businessOneLiner);
    case "guidance":
      return Boolean(card.guidance || ir?.guidance.summary);
    case "analysisSummary":
      return Boolean(card.business?.summary || hd?.analysisSummary);
    case "sentimentSummary":
      return Boolean(card.sentimentSummary || web?.sentimentSummary);
    case "positionKind":
      return Boolean(card.positionKind);
    case "suitability":
      return Boolean(card.suitability);
    default:
      return true;
  }
}
