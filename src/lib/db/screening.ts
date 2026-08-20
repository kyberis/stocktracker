import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";
import {
  parseScreeningPipelineKind,
  type ScreeningPipelineKind,
} from "@/lib/screening/pipeline-kind";
import {
  mergeIrResources,
  parseAnalyzeBriefMeta,
  parseIrAgentOutputJson,
  parseIrStepCompletedPayload,
  parseWebAgentOutputJson,
  fillAnalyzeResourceGaps,
} from "@/lib/screening/analyze-admin";

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

export type ScreeningRunIntent = "rebalance" | "explore" | "analyze";

export interface ScreeningRunRow {
  id: string;
  userId: string;
  status: ScreeningRunStatus;
  intent: ScreeningRunIntent;
  briefJson: string;
  mockedPipeline: boolean;
  /** checklist = existing pipeline; thesis = falsifiable-thesis DAG. */
  pipelineKind?: ScreeningPipelineKind;
  /** Variable ops cost (LLM + Tavily). FMP excluded. */
  costUsd: number;
  /** JSON breakdown — see screeningCostBreakdownSchema. */
  costJson: string;
  createdAt: string;
  updatedAt: string;
  /** Parsed cost breakdown (empty when costJson blank). */
  costBreakdown: import("@/lib/screening/cost").ScreeningCostBreakdown;
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
  const costJson = str(row.cost_json ?? "");
  // Lazy import avoided — parse inline to keep DAL free of circular deps at module load.
  let costBreakdown: import("@/lib/screening/cost").ScreeningCostBreakdown = {
    currency: "USD",
    llmUsd: 0,
    tavilySearchUsd: 0,
    tavilyExtractUsd: 0,
    tavilyResearchUsd: 0,
    tavilySearchCredits: 0,
    tavilyExtractCredits: 0,
    tavilyResearchCredits: 0,
    llmTokensIn: 0,
    llmTokensOut: 0,
  };
  if (costJson.trim()) {
    try {
      const parsed = JSON.parse(costJson) as Record<string, unknown>;
      costBreakdown = {
        currency: "USD",
        llmUsd: Number(parsed.llmUsd) || 0,
        tavilySearchUsd: Number(parsed.tavilySearchUsd) || 0,
        tavilyExtractUsd: Number(parsed.tavilyExtractUsd) || 0,
        tavilyResearchUsd: Number(parsed.tavilyResearchUsd) || 0,
        tavilySearchCredits: Number(parsed.tavilySearchCredits) || 0,
        tavilyExtractCredits: Number(parsed.tavilyExtractCredits) || 0,
        tavilyResearchCredits: Number(parsed.tavilyResearchCredits) || 0,
        llmTokensIn: Number(parsed.llmTokensIn) || 0,
        llmTokensOut: Number(parsed.llmTokensOut) || 0,
      };
    } catch {
      // keep empty
    }
  }
  return {
    id: str(row.id),
    userId: str(row.user_id),
    status: str(row.status) as ScreeningRunStatus,
    intent: str(row.intent) as ScreeningRunIntent,
    briefJson: str(row.brief_json),
    mockedPipeline: num(row.mocked_pipeline) === 1,
    pipelineKind: parseScreeningPipelineKind(row.pipeline_kind),
    costUsd: Number(row.cost_usd) || 0,
    costJson,
    costBreakdown,
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
  pipelineKind?: ScreeningPipelineKind;
  /** Optional fixed id (e.g. mock run id) so the UI deep-link matches the row. */
  id?: string;
}

export async function createScreeningRun(
  params: CreateScreeningRunParams,
): Promise<ScreeningRunRow> {
  const client = await ensureInitialized();
  const id = params.id ?? randomUUID();
  const now = new Date().toISOString();
  const pipelineKind = params.pipelineKind ?? "checklist";
  await client.execute({
    sql: `INSERT INTO screening_runs
            (id, user_id, status, intent, brief_json, mocked_pipeline, pipeline_kind, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.userId,
      params.status,
      params.intent,
      params.briefJson.slice(0, 50_000),
      params.mockedPipeline ? 1 : 0,
      pipelineKind,
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
    pipelineKind,
    costUsd: 0,
    costJson: "",
    costBreakdown: {
      currency: "USD",
      llmUsd: 0,
      tavilySearchUsd: 0,
      tavilyExtractUsd: 0,
      tavilyResearchUsd: 0,
      tavilySearchCredits: 0,
      tavilyExtractCredits: 0,
      tavilyResearchCredits: 0,
      llmTokensIn: 0,
      llmTokensOut: 0,
    },
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

/**
 * Persist variable ops cost for a run (LLM + Tavily). Caller must pass the
 * full merged breakdown — see accrueScreeningRunCost.
 */
export async function updateScreeningRunCost(
  runId: string,
  userId: string,
  costUsd: number,
  breakdown: Record<string, unknown>,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE screening_runs
             SET cost_usd = ?, cost_json = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
    args: [
      Math.max(0, costUsd),
      JSON.stringify(breakdown).slice(0, 20_000),
      new Date().toISOString(),
      runId,
      userId,
    ],
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

export interface ScreeningRunCostAdminRow extends ScreeningRunRow {
  username: string;
  email: string;
}

/**
 * Admin ops: all screening runs ranked by variable cost (highest first).
 * Joins users for display. Never expose on a user-facing route.
 */
export async function listScreeningRunsByCostAdmin(
  opts: { limit?: number; offset?: number; userId?: string } = {},
): Promise<{ runs: ScreeningRunCostAdminRow[]; total: number; totalCostUsd: number }> {
  const client = await ensureInitialized();
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 200);
  const offset = Math.max(0, opts.offset ?? 0);

  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (opts.userId) {
    conditions.push("r.user_id = ?");
    args.push(opts.userId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult, sumResult, result] = await Promise.all([
    client.execute({
      sql: `SELECT COUNT(*) as c FROM screening_runs r ${where}`,
      args,
    }),
    client.execute({
      sql: `SELECT COALESCE(SUM(r.cost_usd), 0) as s FROM screening_runs r ${where}`,
      args,
    }),
    client.execute({
      sql: `SELECT r.*, u.username, u.email
            FROM screening_runs r
            LEFT JOIN users u ON u.id = r.user_id
            ${where}
            ORDER BY r.cost_usd DESC, r.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
  ]);

  return {
    runs: result.rows.map((raw) => {
      const row = raw as unknown as Record<string, unknown>;
      const base = readRun(row);
      return {
        ...base,
        username: str(row.username ?? ""),
        email: str(row.email ?? ""),
      };
    }),
    total: Number(countResult.rows[0]?.c) || 0,
    totalCostUsd: Number(sumResult.rows[0]?.s) || 0,
  };
}

export interface ScreeningAnalyzeAdminUserRow {
  userId: string;
  username: string;
  email: string;
  analyzeCount: number;
  lastRequestedAt: string;
}

export interface ScreeningAnalyzeAdminRunRow extends ScreeningRunCostAdminRow {
  ticker: string | null;
  companyName: string | null;
  exchange: string | null;
  irProvider: import("@/lib/screening/data/ir-site-docs").IrSiteDocsProvider | null;
  serperQueries: number;
  jinaUrls: number;
  irSiteDocsUsed: boolean;
  irPageUrl: string | null;
  documents: import("@/lib/screening/analyze-admin").AnalyzeIrDocument[];
  searchQueries: string[];
  irErrors: string[];
  llmSources: import("@/lib/screening/analyze-admin").AnalyzeLlmSource[];
  guidanceSummary: string | null;
  bullets: string[];
  extractQueries: string[];
  extractUrls: string[];
  searchHits: import("@/lib/screening/analyze-admin").AnalyzeSearchHit[];
}

/**
 * Admin ops: Analyze runs (newest first) plus the users who requested them.
 * Joins IR StepCompleted payloads for Serper/Jina usage. Never expose on a
 * user-facing route.
 */
export async function listScreeningAnalyzeAdmin(
  opts: { limit?: number; offset?: number; userId?: string } = {},
): Promise<{
  users: ScreeningAnalyzeAdminUserRow[];
  runs: ScreeningAnalyzeAdminRunRow[];
  total: number;
  uniqueUsers: number;
  totalCostUsd: number;
}> {
  const client = await ensureInitialized();
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 200);
  const offset = Math.max(0, opts.offset ?? 0);

  const conditions: string[] = ["r.intent = 'analyze'"];
  const args: (string | number)[] = [];
  if (opts.userId) {
    conditions.push("r.user_id = ?");
    args.push(opts.userId);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const [countResult, sumResult, uniqueResult, usersResult, result] =
    await Promise.all([
      client.execute({
        sql: `SELECT COUNT(*) as c FROM screening_runs r ${where}`,
        args,
      }),
      client.execute({
        sql: `SELECT COALESCE(SUM(r.cost_usd), 0) as s FROM screening_runs r ${where}`,
        args,
      }),
      client.execute({
        sql: `SELECT COUNT(DISTINCT r.user_id) as c FROM screening_runs r ${where}`,
        args,
      }),
      client.execute({
        sql: `SELECT r.user_id, u.username, u.email,
                     COUNT(*) as n, MAX(r.created_at) as last_requested_at
              FROM screening_runs r
              LEFT JOIN users u ON u.id = r.user_id
              ${where}
              GROUP BY r.user_id, u.username, u.email
              ORDER BY n DESC, last_requested_at DESC
              LIMIT 100`,
        args,
      }),
      client.execute({
        sql: `SELECT r.*, u.username, u.email
              FROM screening_runs r
              LEFT JOIN users u ON u.id = r.user_id
              ${where}
              ORDER BY r.created_at DESC
              LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
    ]);

  const runsBase = result.rows.map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    const base = readRun(row);
    const meta = parseAnalyzeBriefMeta(base.briefJson);
    return {
      ...base,
      username: str(row.username ?? ""),
      email: str(row.email ?? ""),
      ticker: meta.ticker,
      companyName: meta.companyName,
      exchange: meta.exchange,
      irProvider: null as ScreeningAnalyzeAdminRunRow["irProvider"],
      serperQueries: 0,
      jinaUrls: 0,
      irSiteDocsUsed: false,
      irPageUrl: null as string | null,
      documents: [] as ScreeningAnalyzeAdminRunRow["documents"],
      searchQueries: [] as string[],
      irErrors: [] as string[],
      llmSources: [] as ScreeningAnalyzeAdminRunRow["llmSources"],
      guidanceSummary: null as string | null,
      bullets: [] as string[],
      extractQueries: [] as string[],
      extractUrls: [] as string[],
      searchHits: [] as ScreeningAnalyzeAdminRunRow["searchHits"],
    };
  });

  const runIds = runsBase.map((r) => r.id);
  if (runIds.length > 0) {
    const placeholders = runIds.map(() => "?").join(",");
    const irEvents = await client.execute({
      sql: `SELECT e.run_id, e.payload_json
            FROM screening_run_events e
            INNER JOIN screening_run_steps s ON s.id = e.step_id
            WHERE e.run_id IN (${placeholders})
              AND e.event_type = 'StepCompleted'
              AND s.agent_kind = 'ir_business'`,
      args: runIds,
    });
    const irOutputs = await client.execute({
      sql: `SELECT run_id, agent_kind, output_json
            FROM screening_agent_outputs
            WHERE run_id IN (${placeholders})
              AND agent_kind IN ('ir_business', 'web_sentiment')`,
      args: runIds,
    });
    const webEvents = await client.execute({
      sql: `SELECT e.run_id, e.payload_json
            FROM screening_run_events e
            INNER JOIN screening_run_steps s ON s.id = e.step_id
            WHERE e.run_id IN (${placeholders})
              AND e.event_type = 'StepCompleted'
              AND s.agent_kind = 'web_sentiment'`,
      args: runIds,
    });
    const byRun = new Map<string, ReturnType<typeof parseIrStepCompletedPayload>[]>();
    for (const raw of irEvents.rows) {
      const row = raw as unknown as Record<string, unknown>;
      const runId = str(row.run_id);
      const parsed = parseIrStepCompletedPayload(str(row.payload_json ?? "{}"));
      const list = byRun.get(runId) ?? [];
      list.push(parsed);
      byRun.set(runId, list);
    }
    for (const raw of irOutputs.rows) {
      const row = raw as unknown as Record<string, unknown>;
      const runId = str(row.run_id);
      const kind = str(row.agent_kind ?? "");
      const json = str(row.output_json ?? "{}");
      const parsed =
        kind === "web_sentiment"
          ? parseWebAgentOutputJson(json)
          : parseIrAgentOutputJson(json);
      const list = byRun.get(runId) ?? [];
      list.push(parsed);
      byRun.set(runId, list);
    }
    for (const raw of webEvents.rows) {
      const row = raw as unknown as Record<string, unknown>;
      const runId = str(row.run_id);
      const parsed = parseIrStepCompletedPayload(str(row.payload_json ?? "{}"));
      const list = byRun.get(runId) ?? [];
      list.push(parsed);
      byRun.set(runId, list);
    }
    for (const run of runsBase) {
      const merged = fillAnalyzeResourceGaps(
        mergeIrResources(byRun.get(run.id) ?? []),
        { ticker: run.ticker, companyName: run.companyName, exchange: run.exchange },
        {
          tavilySearchCredits: run.costBreakdown.tavilySearchCredits,
          tavilyExtractCredits: run.costBreakdown.tavilyExtractCredits,
        },
      );
      run.irProvider = merged.provider;
      run.serperQueries = merged.serperQueries;
      run.jinaUrls = merged.jinaUrls;
      run.irSiteDocsUsed = merged.irSiteDocsUsed;
      run.irPageUrl = merged.irPageUrl;
      run.documents = merged.documents;
      run.searchQueries = merged.searchQueries;
      run.irErrors = merged.errors;
      run.llmSources = merged.llmSources;
      run.guidanceSummary = merged.guidanceSummary;
      run.bullets = merged.bullets;
      run.extractQueries = merged.extractQueries;
      run.extractUrls = merged.extractUrls;
      run.searchHits = merged.searchHits;
    }
  }

  return {
    users: usersResult.rows.map((raw) => {
      const row = raw as unknown as Record<string, unknown>;
      return {
        userId: str(row.user_id),
        username: str(row.username ?? ""),
        email: str(row.email ?? ""),
        analyzeCount: Number(row.n) || 0,
        lastRequestedAt: str(row.last_requested_at ?? ""),
      };
    }),
    runs: runsBase,
    total: Number(countResult.rows[0]?.c) || 0,
    uniqueUsers: Number(uniqueResult.rows[0]?.c) || 0,
    totalCostUsd: Number(sumResult.rows[0]?.s) || 0,
  };
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
