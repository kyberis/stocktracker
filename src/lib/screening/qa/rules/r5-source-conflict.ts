import type { QaIssue } from "@/lib/screening/schemas";
import type { QaRule } from "./types";

const NUMBER_IN_TEXT = /(-?\d+(?:\.\d+)?)\s*%/g;

/**
 * R5 — Cross-agent source conflict.
 *
 * Same claim referenced by two agents must not disagree materially. In this
 * first implementation we look at the IR guidance summary and the Web
 * sentiment summary; when both mention a percentage growth number and those
 * numbers disagree by more than 20%, we flag a cross-agent inconsistency.
 */
export const r5SourceConflict: QaRule = (ctx) => {
  const issues: QaIssue[] = [];
  const ir = ctx.irAggregate;
  const web = ctx.webAggregate;
  if (!ir || !web) return issues;

  const webByTicker = new Map(
    web.tickers.map((t) => [t.ticker.toUpperCase(), t]),
  );

  for (const irTicker of ir.tickers) {
    const wt = webByTicker.get(irTicker.ticker.toUpperCase());
    if (!wt) continue;

    const irPct = firstPercent(irTicker.guidance.summary);
    const webPct = firstPercent(wt.sentimentSummary);
    if (irPct == null || webPct == null) continue;

    const denom = Math.max(1, Math.abs(irPct));
    const drift = Math.abs(irPct - webPct) / denom;
    if (drift > 0.2) {
      issues.push({
        issueType: "cross_agent_inconsistency",
        ruleId: "R5",
        agentKind: null,
        ticker: irTicker.ticker,
        claimPath: "guidance.summary vs sentimentSummary",
        expectedValue: `IR ${irPct.toFixed(1)}%`,
        actualValue: `Web ${webPct.toFixed(1)}%`,
        summary:
          "IR guidance and Web sentiment cite growth numbers that disagree by more than 20%.",
        blocking: true,
      });
    }
  }
  return issues;
};

function firstPercent(text: string): number | null {
  if (!text) return null;
  NUMBER_IN_TEXT.lastIndex = 0;
  const match = NUMBER_IN_TEXT.exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}
