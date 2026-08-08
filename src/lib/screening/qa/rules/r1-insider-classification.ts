import type { QaIssue } from "@/lib/screening/schemas";
import { classifyInsiderTransaction } from "@/lib/company-analysis/insider-tags";
import type { QaRule } from "./types";

/**
 * R1 — Insider classification.
 *
 * `webSentiment.insiderSummary.netBias` must be consistent with the evidence
 * in its own `sources` and `notes`. If the notes contain e.g. `RSU withhold`
 * or `option exercise`, the bias should be `none` or `mixed`, not `buying`.
 * We use the same classifier the /analisis feature uses (`classifyInsiderTransaction`).
 */
export const r1InsiderClassification: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const web = ctx.webAggregate;
  if (!web) return issues;

  for (const t of web.tickers) {
    const bias = t.insiderSummary.netBias;
    if (bias === "none" || bias === "mixed") continue;

    const notes = t.insiderSummary.notes ?? "";
    // Any signal at all? If notes are empty AND there are no sources, the
    // agent invented the bias.
    const sourceCount = t.insiderSummary.sources.length;
    if (!notes.trim() && sourceCount === 0) {
      issues.push({
        issueType: "unconfirmed_source",
        ruleId: "R1",
        agentKind: "web_sentiment",
        ticker: t.ticker,
        claimPath: "insiderSummary.netBias",
        expectedValue: "'none' or 'mixed'",
        actualValue: bias,
        summary: `Insider bias '${bias}' asserted without notes or sources.`,
        blocking: true,
      });
      continue;
    }

    // The classifier only reads transaction-type strings; when notes contain
    // classic neutral-transaction jargon, the netBias should not be `buying`.
    const classified = classifyInsiderTransaction(notes);
    if (bias === "buying" && classified === "tag-neutral" && /rsu|option|exercise|award|grant|tax|withhold/i.test(notes)) {
      issues.push({
        issueType: "rule_violation",
        ruleId: "R1",
        agentKind: "web_sentiment",
        ticker: t.ticker,
        claimPath: "insiderSummary.netBias",
        expectedValue: "'none' or 'mixed'",
        actualValue: bias,
        summary:
          "Insider bias claims 'buying' but notes describe RSU/option activity, which is neutral.",
        blocking: true,
      });
    } else if (
      bias === "selling" &&
      classified === "tag-neutral" &&
      /rsu|option|exercise|tax|withhold/i.test(notes)
    ) {
      issues.push({
        issueType: "rule_violation",
        ruleId: "R1",
        agentKind: "web_sentiment",
        ticker: t.ticker,
        claimPath: "insiderSummary.netBias",
        expectedValue: "'none' or 'mixed'",
        actualValue: bias,
        summary:
          "Insider bias claims 'selling' but notes describe RSU/option/tax activity, which is neutral.",
        blocking: true,
      });
    }
  }
  return issues;
};
