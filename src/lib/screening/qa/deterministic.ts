import type { QaIssue, QaOutput } from "@/lib/screening/schemas";
import { r1InsiderClassification } from "./rules/r1-insider-classification";
import { r2SentimentNoise } from "./rules/r2-sentiment-noise";
import { r4PeHistory } from "./rules/r4-pe-history";
import { r5SourceConflict } from "./rules/r5-source-conflict";
import { r9PeerFiltering } from "./rules/r9-peer-filtering";
import { r10AnalystCount } from "./rules/r10-analyst-count";
import { quantMismatch } from "./rules/quant-mismatch";
import type { QaEvaluationContext, QaRule } from "./rules/types";

const ALL_RULES: QaRule[] = [
  r1InsiderClassification,
  r2SentimentNoise,
  r4PeHistory,
  r5SourceConflict,
  r9PeerFiltering,
  r10AnalystCount,
  quantMismatch,
];

/**
 * Deterministic verification (Layer A). Pure function: takes every latest
 * agent output for the run, runs every rule, returns a QaOutput. Layer B
 * (LLM qualitative judge) piggybacks on this in Phase 2.
 */
export function runDeterministicQa(
  ctx: QaEvaluationContext,
  opts: { roundNumber: number },
): QaOutput {
  const issues: QaIssue[] = [];
  for (const rule of ALL_RULES) {
    try {
      const found = rule(ctx);
      if (found.length > 0) issues.push(...found);
    } catch (err) {
      issues.push({
        issueType: "other",
        ruleId: null,
        agentKind: null,
        ticker: null,
        claimPath: "qa/deterministic",
        expectedValue: null,
        actualValue: null,
        summary: `Rule execution threw: ${err instanceof Error ? err.message : "unknown"}`,
        blocking: false,
      });
    }
  }

  const capped = issues.slice(0, 50);
  const hasBlocking = capped.some((i) => i.blocking);
  const verdict: QaOutput["verdict"] = hasBlocking ? "fail" : "pass";

  const flaggedAgentKindsSet = new Set<string>();
  for (const i of capped) {
    if (i.blocking && i.agentKind) flaggedAgentKindsSet.add(i.agentKind);
  }

  return {
    verdict,
    roundNumber: opts.roundNumber,
    issues: capped,
    flaggedAgentKinds: Array.from(flaggedAgentKindsSet),
    degradedTickers: [],
    generatedAt: new Date().toISOString(),
  };
}
