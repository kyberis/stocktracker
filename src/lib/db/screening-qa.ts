import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

/**
 * QA agent (Agent 6) persistence (v132).
 *
 * `screening_qa_rounds` holds one row per QA issue so we can query issues by
 * (run, round) or by (run, agent_kind, ticker) when a rerun handler needs to
 * inject correction hints. The aggregate verdict + issue list is also mirrored
 * to `screening_agent_outputs` under `agent_kind='qa'` for compose-time reads.
 *
 * Everything here is run-scoped; there is no user column on the round row
 * itself — the run FK owns access control.
 */

export type QaVerdict = "pass" | "fail" | "pass_with_degradation";

export type QaIssueType =
  | "quant_mismatch"
  | "unconfirmed_source"
  | "cross_agent_inconsistency"
  | "rule_violation"
  | "other";

export interface QaIssueRow {
  id: string;
  runId: string;
  roundNumber: number;
  verdict: QaVerdict;
  flaggedAgentKinds: string[];
  degradedTickers: string[];
  issueType: QaIssueType | null;
  ruleId: string | null;
  agentKind: string | null;
  ticker: string | null;
  claimPath: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  issueSummary: string | null;
  blocking: boolean;
  createdAt: string;
}

export interface InsertQaIssueInput {
  issueType: QaIssueType | null;
  ruleId?: string | null;
  agentKind?: string | null;
  ticker?: string | null;
  claimPath?: string | null;
  expectedValue?: string | null;
  actualValue?: string | null;
  issueSummary?: string | null;
  blocking?: boolean;
}

export interface InsertQaRoundInput {
  runId: string;
  roundNumber: number;
  verdict: QaVerdict;
  flaggedAgentKinds: string[];
  degradedTickers: string[];
  issues: InsertQaIssueInput[];
}

function readRow(row: Record<string, unknown>): QaIssueRow {
  const rawTicker = row.ticker;
  return {
    id: str(row.id),
    runId: str(row.run_id),
    roundNumber: num(row.round_number),
    verdict: str(row.verdict) as QaVerdict,
    flaggedAgentKinds: safeParseJsonArray(str(row.flagged_agent_kinds)),
    degradedTickers: safeParseJsonArray(str(row.degraded_tickers)),
    issueType: nullableStr(row.issue_type) as QaIssueType | null,
    ruleId: nullableStr(row.rule_id),
    agentKind: nullableStr(row.agent_kind),
    ticker:
      rawTicker == null || rawTicker === "" ? null : String(rawTicker).toUpperCase(),
    claimPath: nullableStr(row.claim_path),
    expectedValue: nullableStr(row.expected_value),
    actualValue: nullableStr(row.actual_value),
    issueSummary: nullableStr(row.issue_summary),
    blocking: num(row.blocking) === 1,
    createdAt: str(row.created_at),
  };
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function safeParseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/**
 * Insert one row per issue for a given QA round. When the round has no issues
 * (clean pass) we still insert a single header row so admins can see the round
 * happened and query counts by verdict.
 */
export async function insertQaRoundIssues(
  input: InsertQaRoundInput,
): Promise<QaIssueRow[]> {
  const client = await ensureInitialized();
  const flagged = JSON.stringify(input.flaggedAgentKinds.slice(0, 20));
  const degraded = JSON.stringify(input.degradedTickers.slice(0, 20));
  const now = new Date().toISOString();

  const rowsToInsert: InsertQaIssueInput[] =
    input.issues.length > 0
      ? input.issues
      : [
          {
            issueType: null,
            issueSummary: null,
            blocking: false,
          },
        ];

  const inserted: QaIssueRow[] = [];
  for (const issue of rowsToInsert) {
    const id = randomUUID();
    const ticker =
      issue.ticker == null || issue.ticker === ""
        ? null
        : issue.ticker.toUpperCase().slice(0, 20);
    await client.execute({
      sql: `INSERT INTO screening_qa_rounds
              (id, run_id, round_number, verdict,
               flagged_agent_kinds, degraded_tickers,
               issue_type, rule_id, agent_kind, ticker,
               claim_path, expected_value, actual_value,
               issue_summary, blocking, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.runId,
        input.roundNumber,
        input.verdict,
        flagged,
        degraded,
        issue.issueType ?? null,
        issue.ruleId ?? null,
        issue.agentKind ?? null,
        ticker,
        issue.claimPath ? issue.claimPath.slice(0, 500) : null,
        issue.expectedValue ? issue.expectedValue.slice(0, 1000) : null,
        issue.actualValue ? issue.actualValue.slice(0, 1000) : null,
        issue.issueSummary ? issue.issueSummary.slice(0, 1000) : null,
        issue.blocking === false ? 0 : 1,
        now,
      ],
    });
    inserted.push({
      id,
      runId: input.runId,
      roundNumber: input.roundNumber,
      verdict: input.verdict,
      flaggedAgentKinds: input.flaggedAgentKinds,
      degradedTickers: input.degradedTickers,
      issueType: issue.issueType ?? null,
      ruleId: issue.ruleId ?? null,
      agentKind: issue.agentKind ?? null,
      ticker,
      claimPath: issue.claimPath ?? null,
      expectedValue: issue.expectedValue ?? null,
      actualValue: issue.actualValue ?? null,
      issueSummary: issue.issueSummary ?? null,
      blocking: issue.blocking !== false,
      createdAt: now,
    });
  }
  return inserted;
}

/**
 * All QA rounds for a run, oldest first. Used by admin views and the retry
 * planner to count prior rounds.
 */
export async function listQaRoundsByRun(runId: string): Promise<QaIssueRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_qa_rounds
          WHERE run_id = ?
          ORDER BY round_number ASC, created_at ASC`,
    args: [runId],
  });
  return result.rows.map((r) => readRow(r as unknown as Record<string, unknown>));
}

/**
 * Count of distinct QA rounds for a run — round cap enforcement.
 */
export async function countQaRoundsForRun(runId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT COUNT(DISTINCT round_number) AS n
          FROM screening_qa_rounds WHERE run_id = ?`,
    args: [runId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? num(row.n) : 0;
}

/**
 * Latest QA verdict for a run — used by report gating.
 * Returns null when QA has not yet run.
 */
export async function getLatestQaVerdictForRun(
  runId: string,
): Promise<{
  verdict: QaVerdict;
  roundNumber: number;
  degradedTickers: string[];
} | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT round_number, verdict, degraded_tickers
          FROM screening_qa_rounds
          WHERE run_id = ?
          ORDER BY round_number DESC, created_at DESC
          LIMIT 1`,
    args: [runId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    verdict: str(row.verdict) as QaVerdict,
    roundNumber: num(row.round_number),
    degradedTickers: safeParseJsonArray(str(row.degraded_tickers)),
  };
}

/**
 * Latest issues for a specific (agent_kind, ticker) in a run. Rerun handlers
 * call this to inject the QA correction hint into their next user prompt.
 */
export async function getLatestQaIssuesForAgentTicker(
  runId: string,
  agentKind: string,
  ticker: string | null,
): Promise<QaIssueRow[]> {
  const client = await ensureInitialized();
  const args: Array<string | number | null> = [runId, agentKind];
  let tickerClause = "AND ticker IS NULL";
  if (ticker) {
    tickerClause = "AND ticker = ?";
    args.push(ticker.toUpperCase());
  }
  const result = await client.execute({
    sql: `SELECT * FROM screening_qa_rounds
          WHERE run_id = ? AND agent_kind = ? ${tickerClause}
          ORDER BY round_number DESC, created_at DESC`,
    args,
  });
  return result.rows
    .map((r) => readRow(r as unknown as Record<string, unknown>))
    .filter((r) => r.issueType != null);
}
