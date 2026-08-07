import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

/**
 * Investment screening persistence (v129).
 *
 * Two tables:
 *   - `screening_runs`      — one row per user launch attempt. Holds the brief
 *                              the Intake agent produced. `mocked_pipeline=1`
 *                              means the research pipeline that generated the
 *                              report is still the fixture.
 *   - `screening_agent_outputs` — one row per agent turn (Intake for now).
 *                              `run_id` is nullable so we can log the Intake
 *                              chat before the user has committed to a run.
 *
 * Everything here is user-scoped; there is no shared/global row.
 */

export type ScreeningRunStatus =
  | "draft"
  | "needs_clarification"
  | "rejected_infeasible"
  | "authorized"
  | "running"
  | "completed";

export type ScreeningRunIntent = "rebalance" | "explore";

export interface ScreeningRunRow {
  id: string;
  userId: string;
  status: ScreeningRunStatus;
  intent: ScreeningRunIntent;
  briefJson: string;
  mockedPipeline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningAgentOutputRow {
  id: string;
  runId: string | null;
  userId: string;
  agentKind: string;
  /** Set for per-ticker agents (IR, Web, …). Null for global steps. */
  ticker: string | null;
  agentIndex: number | null;
  outputJson: string;
  latencyMs: number;
  createdAt: string;
}

function readRun(row: Record<string, unknown>): ScreeningRunRow {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    status: str(row.status) as ScreeningRunStatus,
    intent: str(row.intent) as ScreeningRunIntent,
    briefJson: str(row.brief_json),
    mockedPipeline: num(row.mocked_pipeline) === 1,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function readOutput(row: Record<string, unknown>): ScreeningAgentOutputRow {
  const rawRun = row.run_id;
  const rawTicker = row.ticker;
  const rawIndex = row.agent_index;
  return {
    id: str(row.id),
    runId: rawRun == null || rawRun === "" ? null : str(rawRun),
    userId: str(row.user_id),
    agentKind: str(row.agent_kind),
    ticker: rawTicker == null || rawTicker === "" ? null : str(rawTicker),
    agentIndex:
      rawIndex == null || rawIndex === ""
        ? null
        : Number.isFinite(num(rawIndex))
          ? num(rawIndex)
          : null,
    outputJson: str(row.output_json),
    latencyMs: num(row.latency_ms),
    createdAt: str(row.created_at),
  };
}

export interface CreateScreeningRunParams {
  userId: string;
  status: ScreeningRunStatus;
  intent: ScreeningRunIntent;
  briefJson: string;
  mockedPipeline: boolean;
  /** Optional fixed id (e.g. mock run id) so the UI deep-link matches the row. */
  id?: string;
}

export async function createScreeningRun(
  params: CreateScreeningRunParams,
): Promise<ScreeningRunRow> {
  const client = await ensureInitialized();
  const id = params.id ?? randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO screening_runs
            (id, user_id, status, intent, brief_json, mocked_pipeline, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.userId,
      params.status,
      params.intent,
      params.briefJson.slice(0, 50_000),
      params.mockedPipeline ? 1 : 0,
      now,
      now,
    ],
  });
  return {
    id,
    userId: params.userId,
    status: params.status,
    intent: params.intent,
    briefJson: params.briefJson,
    mockedPipeline: params.mockedPipeline,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateScreeningRunStatus(
  runId: string,
  userId: string,
  status: ScreeningRunStatus,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE screening_runs SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    args: [status, new Date().toISOString(), runId, userId],
  });
}

export async function getScreeningRun(
  runId: string,
  userId: string,
): Promise<ScreeningRunRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_runs WHERE id = ? AND user_id = ?`,
    args: [runId, userId],
  });
  const row = result.rows[0];
  return row ? readRun(row as unknown as Record<string, unknown>) : null;
}

/**
 * Recent runs for the entry-page history list. Ordered newest first.
 * Caps at 50 to keep the entry page snappy.
 */
export async function listScreeningRunsByUser(
  userId: string,
  limit = 20,
): Promise<ScreeningRunRow[]> {
  const client = await ensureInitialized();
  const capped = Math.min(Math.max(1, limit), 50);
  const result = await client.execute({
    sql: `SELECT * FROM screening_runs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [userId, capped],
  });
  return result.rows.map((r) => readRun(r as unknown as Record<string, unknown>));
}

/**
 * Unscoped variant for the internal worker: the step row does not carry
 * `user_id`, so the orchestrator loads the run by id only. Never expose this
 * on a user-facing route.
 */
export async function getScreeningRunUnscoped(
  runId: string,
): Promise<ScreeningRunRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_runs WHERE id = ?`,
    args: [runId],
  });
  const row = result.rows[0];
  return row ? readRun(row as unknown as Record<string, unknown>) : null;
}

export interface InsertScreeningAgentOutputParams {
  userId: string;
  runId?: string | null;
  agentKind: string;
  outputJson: string;
  latencyMs: number;
  /** Per-ticker agents (IR / Web) set this; global steps leave it null. */
  ticker?: string | null;
  agentIndex?: number | null;
}

export async function insertScreeningAgentOutput(
  params: InsertScreeningAgentOutputParams,
): Promise<ScreeningAgentOutputRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const now = new Date().toISOString();
  const ticker =
    params.ticker == null || params.ticker === ""
      ? null
      : params.ticker.toUpperCase().slice(0, 20);
  const agentIndex =
    params.agentIndex == null || !Number.isFinite(params.agentIndex)
      ? null
      : Math.round(params.agentIndex);
  await client.execute({
    sql: `INSERT INTO screening_agent_outputs
            (id, run_id, user_id, agent_kind, ticker, agent_index, output_json, latency_ms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.runId ?? null,
      params.userId,
      params.agentKind,
      ticker,
      agentIndex,
      params.outputJson.slice(0, 50_000),
      Math.max(0, Math.round(params.latencyMs)),
      now,
    ],
  });
  return {
    id,
    runId: params.runId ?? null,
    userId: params.userId,
    agentKind: params.agentKind,
    ticker,
    agentIndex,
    outputJson: params.outputJson,
    latencyMs: params.latencyMs,
    createdAt: now,
  };
}

/**
 * Unscoped list of all outputs of a given agent kind for a run. Used by the
 * aggregate barrier and the Compiler. Never expose on a user-facing route.
 */
export async function listScreeningAgentOutputsByRunAndKind(
  runId: string,
  agentKind: string,
): Promise<ScreeningAgentOutputRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_agent_outputs
          WHERE run_id = ? AND agent_kind = ?
          ORDER BY COALESCE(agent_index, 0) ASC, created_at ASC`,
    args: [runId, agentKind],
  });
  return result.rows.map((r) => readOutput(r as unknown as Record<string, unknown>));
}

export async function listScreeningAgentOutputsByUser(
  userId: string,
  limit = 20,
): Promise<ScreeningAgentOutputRow[]> {
  const client = await ensureInitialized();
  const capped = Math.min(Math.max(1, limit), 100);
  const result = await client.execute({
    sql: `SELECT * FROM screening_agent_outputs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [userId, capped],
  });
  return result.rows.map((r) => readOutput(r as unknown as Record<string, unknown>));
}

export async function listScreeningAgentOutputsByRun(
  runId: string,
  userId: string,
): Promise<ScreeningAgentOutputRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_agent_outputs
          WHERE run_id = ? AND user_id = ?
          ORDER BY created_at ASC`,
    args: [runId, userId],
  });
  return result.rows.map((r) => readOutput(r as unknown as Record<string, unknown>));
}

/**
 * Unscoped variant used by the worker's Compiler step. Returns the most recent
 * output of a given agent kind for a run. Never expose on a user route — this
 * skips the user_id scope.
 */
export async function getLatestScreeningAgentOutputUnscoped(
  runId: string,
  agentKind: string,
): Promise<ScreeningAgentOutputRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_agent_outputs
          WHERE run_id = ? AND agent_kind = ?
          ORDER BY created_at DESC
          LIMIT 1`,
    args: [runId, agentKind],
  });
  const row = result.rows[0];
  return row ? readOutput(row as unknown as Record<string, unknown>) : null;
}

/**
 * Link an unassigned agent output (typically an Intake row logged before the
 * user pressed "Launch") to a newly created run. Returns the number of rows
 * updated. User-scoped for safety.
 */
export async function linkPendingAgentOutputToRun(opts: {
  userId: string;
  agentKind: string;
  runId: string;
  /** Only rows created within the last N minutes are eligible. */
  withinMinutes?: number;
}): Promise<number> {
  const client = await ensureInitialized();
  const within = Math.max(1, Math.min(1440, opts.withinMinutes ?? 60));
  // libSQL/SQLite doesn't have `INTERVAL`; use datetime('now', '-Xminutes').
  const result = await client.execute({
    sql: `UPDATE screening_agent_outputs
             SET run_id = ?
           WHERE id = (
             SELECT id FROM screening_agent_outputs
              WHERE user_id = ?
                AND agent_kind = ?
                AND (run_id IS NULL OR run_id = '')
                AND created_at >= datetime('now', ?)
              ORDER BY created_at DESC
              LIMIT 1
           )`,
    args: [opts.runId, opts.userId, opts.agentKind, `-${within} minutes`],
  });
  return result.rowsAffected ?? 0;
}
