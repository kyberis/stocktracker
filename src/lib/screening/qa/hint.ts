import { getLatestQaIssuesForAgentTicker } from "@/lib/db";

/**
 * Build a `QA_ISSUES_JSON:` prompt block for a per-ticker rerun. Returns "" when
 * no prior QA issues exist for that (run, agent, ticker) tuple — callers use
 * the empty string as a no-op suffix.
 */
export async function buildQaHintBlock(
  runId: string,
  agentKind: string,
  ticker: string | null,
): Promise<string> {
  const issues = await getLatestQaIssuesForAgentTicker(runId, agentKind, ticker);
  if (!issues || issues.length === 0) return "";
  const payload = issues.slice(0, 6).map((i) => ({
    ruleId: i.ruleId,
    issueType: i.issueType,
    claimPath: i.claimPath,
    expectedValue: i.expectedValue,
    actualValue: i.actualValue,
    summary: i.issueSummary,
  }));
  return `\n\nQA_ISSUES_JSON (prior round flagged these — fix each before returning):\n${JSON.stringify(payload)}`;
}
