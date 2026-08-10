import type { AggregateIrBusinessOutput, QaIssue } from "@/lib/screening/schemas";
import { classifyGuidanceAsOf } from "@/lib/screening/qa/guidance-asof";

function layerAR6Keys(layerAIssues: QaIssue[]): Set<string> {
  const keys = new Set<string>();
  for (const i of layerAIssues) {
    if (i.ruleId !== "R6") continue;
    keys.add(
      `${(i.ticker ?? "").toUpperCase()}|${i.claimPath ?? "guidance.asOf"}`,
    );
  }
  return keys;
}

function resolveGuidanceAsOf(
  issue: QaIssue,
  irAggregate: AggregateIrBusinessOutput | null | undefined,
): string | null {
  const fromIssue = issue.actualValue?.trim();
  if (fromIssue) return fromIssue;
  const ticker = (issue.ticker ?? "").toUpperCase();
  if (!ticker || !irAggregate) return null;
  const row = irAggregate.tickers.find((t) => t.ticker.toUpperCase() === ticker);
  const asOf = row?.guidance?.asOf?.trim();
  return asOf || null;
}

/**
 * Drop Layer B R6 date issues that Layer A already owns or that contradict a
 * valid recent guidance.asOf (common LLM calendar false positive).
 */
export function filterSpuriousLayerBR6Issues(input: {
  layerBIssues: QaIssue[];
  layerAIssues: QaIssue[];
  irAggregate?: AggregateIrBusinessOutput | null;
  now?: Date;
}): QaIssue[] {
  const now = input.now ?? new Date();
  const aKeys = layerAR6Keys(input.layerAIssues);

  return input.layerBIssues.filter((issue) => {
    if (issue.ruleId !== "R6") return true;

    const key = `${(issue.ticker ?? "").toUpperCase()}|${issue.claimPath ?? "guidance.asOf"}`;
    if (aKeys.has(key)) return false;

    const asOfRaw = resolveGuidanceAsOf(issue, input.irAggregate);
    if (!asOfRaw) {
      // Layer A owns date checks; without a date Layer B cannot add a real R6.
      return false;
    }

    const freshness = classifyGuidanceAsOf(asOfRaw, now);
    // Keep only when Layer A missed a genuine stale / future / unparseable date.
    return freshness !== "ok";
  });
}

/**
 * For report display: hide R6 issues whose asOf is actually within the valid
 * window (fixes already-persisted Layer B false positives without re-running QA).
 */
export function filterSpuriousR6IssuesForDisplay(input: {
  issues: QaIssue[];
  irAggregate?: AggregateIrBusinessOutput | null;
  now?: Date;
}): QaIssue[] {
  const now = input.now ?? new Date();
  return input.issues.filter((issue) => {
    if (issue.ruleId !== "R6") return true;
    const asOfRaw = resolveGuidanceAsOf(issue, input.irAggregate);
    if (!asOfRaw) return true;
    return classifyGuidanceAsOf(asOfRaw, now) !== "ok";
  });
}
