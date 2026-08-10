import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

/**
 * Durable step queue + append-only event store for the investment screening
 * orchestrator (HLD §7). The worker (`/api/internal/screening/worker`) leases
 * one pending step at a time via `leasePendingStep`, executes the agent, and
 * closes with `completeStep` / `failStep`. A cron (`screening-recover`) resets
 * expired leases every few minutes.
 */

export type ScreeningStepStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped";

export interface ScreeningStepRow {
  id: string;
  runId: string;
  agentKind: string;
  ticker: string | null;
  status: ScreeningStepStatus;
  attempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  dependsOn: string[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningRunEventRow {
  id: string;
  runId: string;
  stepId: string | null;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

/** Max attempts before a step is permanently marked as `failed`. */
export const MAX_STEP_ATTEMPTS = 3;

/**
 * Cap concurrent running steps per run so fan-out (IR × N tickers) does not
 * stampede FMP / the AI gateway. Matches PRD §13 "3–5 steps a la vez por job".
 */
/** Cap concurrent running steps per run so IR + Web fan-out can parallelise. */
export const MAX_RUNNING_PER_RUN = 4;

function readStep(row: Record<string, unknown>): ScreeningStepRow {
  let dependsOn: string[] = [];
  const rawDeps = str(row.depends_on);
  if (rawDeps) {
    try {
      const parsed = JSON.parse(rawDeps);
      if (Array.isArray(parsed)) {
        dependsOn = parsed.filter((v): v is string => typeof v === "string");
      }
    } catch {
      dependsOn = [];
    }
  }
  const rawTicker = row.ticker;
  const rawLeaseOwner = row.lease_owner;
  const rawLeaseExpires = row.lease_expires_at;
  const rawErr = row.error_message;
  const rawStarted = row.started_at;
  const rawCompleted = row.completed_at;
  return {
    id: str(row.id),
    runId: str(row.run_id),
    agentKind: str(row.agent_kind),
    ticker: rawTicker == null || rawTicker === "" ? null : str(rawTicker),
    status: str(row.status) as ScreeningStepStatus,
    attempts: num(row.attempts),
    leaseOwner:
      rawLeaseOwner == null || rawLeaseOwner === "" ? null : str(rawLeaseOwner),
    leaseExpiresAt:
      rawLeaseExpires == null || rawLeaseExpires === "" ? null : str(rawLeaseExpires),
    dependsOn,
    errorMessage: rawErr == null || rawErr === "" ? null : str(rawErr),
    startedAt: rawStarted == null || rawStarted === "" ? null : str(rawStarted),
    completedAt: rawCompleted == null || rawCompleted === "" ? null : str(rawCompleted),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function readEvent(row: Record<string, unknown>): ScreeningRunEventRow {
  const rawStep = row.step_id;
  return {
    id: str(row.id),
    runId: str(row.run_id),
    stepId: rawStep == null || rawStep === "" ? null : str(rawStep),
    eventType: str(row.event_type),
    payloadJson: str(row.payload_json),
    createdAt: str(row.created_at),
  };
}

export interface InsertStepInput {
  /** Optional pre-computed id, so callers can wire `depends_on` before insert. */
  id?: string;
  agentKind: string;
  ticker?: string | null;
  dependsOn?: string[];
}

/**
 * Insert one or more steps for a run in a single transaction. Returns the
 * inserted rows in the same order, with any auto-generated ids filled in.
 */
export async function insertSteps(
  runId: string,
  defs: InsertStepInput[],
): Promise<ScreeningStepRow[]> {
  if (defs.length === 0) return [];
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const stmts = defs.map((def) => {
    const id = def.id ?? randomUUID();
    return {
      id,
      sql: `INSERT INTO screening_run_steps
              (id, run_id, agent_kind, ticker, status, attempts, depends_on, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      args: [
        id,
        runId,
        def.agentKind,
        def.ticker ?? null,
        JSON.stringify(def.dependsOn ?? []),
        now,
        now,
      ] as (string | number | null)[],
    };
  });

  await client.batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args })),
    "write",
  );

  return stmts.map(
    (s, i): ScreeningStepRow => ({
      id: s.id,
      runId,
      agentKind: defs[i].agentKind,
      ticker: defs[i].ticker ?? null,
      status: "pending",
      attempts: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      dependsOn: defs[i].dependsOn ?? [],
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

/**
 * Atomically lease the next runnable step for `runId` (or globally if runId is
 * null). A step is runnable when status='pending' and every dependency id is
 * already 'done'. Returns null when nothing is runnable.
 */
export async function leasePendingStep(opts: {
  runId: string | null;
  ownerId: string;
  leaseMs: number;
}): Promise<ScreeningStepRow | null> {
  const client = await ensureInitialized();
  const nowIso = new Date().toISOString();
  const leaseExpires = new Date(Date.now() + Math.max(1000, opts.leaseMs)).toISOString();

  // Two-step atomic lease: pick the id first (respecting deps), then update it
  // with WHERE status='pending' as the guard against a race. libSQL does not
  // support subqueries in UPDATE ... WHERE id = (SELECT ...) with joins the
  // way we need for the dependency check, so we do it in two round-trips.
  const scope = opts.runId ? "AND run_id = ?" : "";
  const scopeArgs: (string | number | null)[] = opts.runId ? [opts.runId] : [];

  const candidates = await client.execute({
    sql: `SELECT id, run_id, depends_on
            FROM screening_run_steps
           WHERE status = 'pending'
             ${scope}
           ORDER BY created_at ASC
           LIMIT 20`,
    args: scopeArgs,
  });

  for (const rawRow of candidates.rows) {
    const row = rawRow as unknown as Record<string, unknown>;
    const candidateId = str(row.id);
    const candidateRunId = str(row.run_id);
    let deps: string[] = [];
    try {
      const parsed = JSON.parse(str(row.depends_on) || "[]");
      if (Array.isArray(parsed)) deps = parsed.filter((v) => typeof v === "string");
    } catch {
      deps = [];
    }

    if (deps.length > 0) {
      const placeholders = deps.map(() => "?").join(",");
      const depsResult = await client.execute({
        sql: `SELECT id, status FROM screening_run_steps WHERE id IN (${placeholders})`,
        args: deps,
      });
      // If any dep failed or was skipped, cascade-skip this step so the run
      // doesn't sit forever waiting for a dead prerequisite. Do this BEFORE
      // the "all done" bail so we make forward progress.
      const anyBlocking = depsResult.rows.some((r) => {
        const status = str((r as unknown as Record<string, unknown>).status);
        return status === "failed" || status === "skipped";
      });
      if (anyBlocking) {
        await client.execute({
          sql: `UPDATE screening_run_steps
                   SET status = 'skipped',
                       error_message = 'dependency_failed',
                       completed_at = ?,
                       updated_at = ?
                 WHERE id = ? AND status = 'pending'`,
          args: [nowIso, nowIso, candidateId],
        });
        continue;
      }
      const allDone =
        depsResult.rows.length === deps.length &&
        depsResult.rows.every(
          (r) =>
            str((r as unknown as Record<string, unknown>).status) === "done",
        );
      if (!allDone) continue;
    }

    // Cap concurrent running steps per run (fan-out throttle).
    const runningCount = await client.execute({
      sql: `SELECT COUNT(*) AS c FROM screening_run_steps
             WHERE run_id = ? AND status = 'running'`,
      args: [candidateRunId],
    });
    const running = num(
      (runningCount.rows[0] as unknown as Record<string, unknown>).c,
    );
    if (running >= MAX_RUNNING_PER_RUN) {
      continue;
    }

    // Race-safe UPDATE: only wins if the row is still pending.
    const updated = await client.execute({
      sql: `UPDATE screening_run_steps
               SET status = 'running',
                   attempts = attempts + 1,
                   lease_owner = ?,
                   lease_expires_at = ?,
                   started_at = COALESCE(started_at, ?),
                   updated_at = ?
             WHERE id = ? AND status = 'pending'
             RETURNING *`,
      args: [opts.ownerId, leaseExpires, nowIso, nowIso, candidateId],
    });
    if (updated.rows.length === 0) continue;
    // Emit StepStarted for observability. Non-fatal if it fails.
    try {
      await appendEvent({
        runId: candidateRunId,
        stepId: candidateId,
        eventType: "StepStarted",
        payload: { leaseOwner: opts.ownerId, leaseExpiresAt: leaseExpires },
      });
    } catch {
      // event store is a best-effort append log
    }
    return readStep(updated.rows[0] as unknown as Record<string, unknown>);
  }

  return null;
}

export async function completeStep(opts: {
  stepId: string;
  ownerId: string;
  payload?: Record<string, unknown>;
}): Promise<ScreeningStepRow | null> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const updated = await client.execute({
    sql: `UPDATE screening_run_steps
             SET status = 'done',
                 lease_owner = NULL,
                 lease_expires_at = NULL,
                 completed_at = ?,
                 updated_at = ?,
                 error_message = NULL
           WHERE id = ? AND status = 'running' AND lease_owner = ?
           RETURNING *`,
    args: [now, now, opts.stepId, opts.ownerId],
  });
  if (updated.rows.length === 0) return null;
  const row = readStep(updated.rows[0] as unknown as Record<string, unknown>);
  try {
    await appendEvent({
      runId: row.runId,
      stepId: row.id,
      eventType: "StepCompleted",
      payload: { attempts: row.attempts, ...opts.payload },
    });
  } catch {
    // best-effort
  }
  return row;
}

export async function failStep(opts: {
  stepId: string;
  ownerId: string;
  errorMessage: string;
}): Promise<ScreeningStepRow | null> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  // If attempts >= MAX_STEP_ATTEMPTS, mark permanently failed; otherwise
  // return to 'pending' so the next worker (or the recover cron) retries it.
  const current = await client.execute({
    sql: `SELECT attempts, run_id FROM screening_run_steps
           WHERE id = ? AND lease_owner = ?`,
    args: [opts.stepId, opts.ownerId],
  });
  if (current.rows.length === 0) return null;
  const row = current.rows[0] as unknown as Record<string, unknown>;
  const attempts = num(row.attempts);
  const runId = str(row.run_id);
  const willRetry = attempts < MAX_STEP_ATTEMPTS;
  const nextStatus: ScreeningStepStatus = willRetry ? "pending" : "failed";

  const updated = await client.execute({
    sql: `UPDATE screening_run_steps
             SET status = ?,
                 lease_owner = NULL,
                 lease_expires_at = NULL,
                 error_message = ?,
                 completed_at = CASE WHEN ? = 'failed' THEN ? ELSE completed_at END,
                 updated_at = ?
           WHERE id = ? AND lease_owner IS NULL OR lease_owner = ?
           RETURNING *`,
    args: [
      nextStatus,
      opts.errorMessage.slice(0, 500),
      nextStatus,
      now,
      now,
      opts.stepId,
      opts.ownerId,
    ],
  });
  const stepRow =
    updated.rows.length > 0
      ? readStep(updated.rows[0] as unknown as Record<string, unknown>)
      : null;

  try {
    await appendEvent({
      runId,
      stepId: opts.stepId,
      eventType: willRetry ? "StepFailed" : "StepPermanentlyFailed",
      payload: { attempts, error: opts.errorMessage.slice(0, 300) },
    });
  } catch {
    // best-effort
  }

  return stepRow;
}

/**
 * Recover expired leases and mark exhausted retries as failed. Returns the
 * number of steps returned to `pending` (retriable) and permanently failed.
 */
/**
 * Touch `updated_at` and push `lease_expires_at` forward while a long step
 * (e.g. shortlist Tavily research) is still making progress. Keeps the UI
 * stall detector from marking a live step as stuck, and gives recover a
 * sharper signal when the worker actually dies.
 */
export async function heartbeatStepLease(opts: {
  stepId: string;
  ownerId: string;
  /** How far ahead to set lease_expires_at from now (default 90s). */
  leaseMs?: number;
}): Promise<boolean> {
  const client = await ensureInitialized();
  const now = new Date();
  const leaseMs = Math.max(5_000, opts.leaseMs ?? 90_000);
  const expires = new Date(now.getTime() + leaseMs).toISOString();
  const result = await client.execute({
    sql: `UPDATE screening_run_steps
             SET lease_expires_at = ?,
                 updated_at = ?
           WHERE id = ? AND status = 'running' AND lease_owner = ?`,
    args: [expires, now.toISOString(), opts.stepId, opts.ownerId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Force-expire every `running` lease for one run so resume / recover can
 * reclaim zombie steps whose worker died before `lease_expires_at`.
 * Does not change status — pair with {@link recoverExpiredLeases}.
 */
export async function forceExpireRunningLeasesForRun(
  runId: string,
  now = new Date(),
): Promise<number> {
  const client = await ensureInitialized();
  const past = new Date(now.getTime() - 1_000).toISOString();
  const result = await client.execute({
    sql: `UPDATE screening_run_steps
             SET lease_expires_at = ?
           WHERE run_id = ? AND status = 'running'`,
    args: [past, runId],
  });
  return result.rowsAffected ?? 0;
}

export async function recoverExpiredLeases(
  now = new Date(),
): Promise<{ requeued: number; failed: number }> {
  const client = await ensureInitialized();
  const iso = now.toISOString();
  const expired = await client.execute({
    sql: `SELECT id, run_id, attempts FROM screening_run_steps
           WHERE status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < ?`,
    args: [iso],
  });
  let requeued = 0;
  let failed = 0;
  for (const raw of expired.rows) {
    const row = raw as unknown as Record<string, unknown>;
    const id = str(row.id);
    const runId = str(row.run_id);
    const attempts = num(row.attempts);
    const willRetry = attempts < MAX_STEP_ATTEMPTS;
    const nextStatus: ScreeningStepStatus = willRetry ? "pending" : "failed";
    await client.execute({
      sql: `UPDATE screening_run_steps
               SET status = ?,
                   lease_owner = NULL,
                   lease_expires_at = NULL,
                   error_message = 'lease_expired',
                   completed_at = CASE WHEN ? = 'failed' THEN ? ELSE completed_at END,
                   updated_at = ?
             WHERE id = ? AND status = 'running'`,
      args: [nextStatus, nextStatus, iso, iso, id],
    });
    if (willRetry) requeued++;
    else failed++;
    try {
      await appendEvent({
        runId,
        stepId: id,
        eventType: "StepLeaseExpired",
        payload: { attempts, requeued: willRetry },
      });
    } catch {
      // best-effort
    }
  }
  return { requeued, failed };
}

export async function listStepsForRun(runId: string): Promise<ScreeningStepRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_run_steps WHERE run_id = ? ORDER BY created_at ASC`,
    args: [runId],
  });
  return result.rows.map((r) => readStep(r as unknown as Record<string, unknown>));
}

export async function getStepById(
  stepId: string,
): Promise<ScreeningStepRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_run_steps WHERE id = ?`,
    args: [stepId],
  });
  const row = result.rows[0];
  return row ? readStep(row as unknown as Record<string, unknown>) : null;
}

/**
 * Rewire `depends_on` for an existing step (e.g. Hard Data inserts IR fan-out
 * and moves the Compiler barrier to depend on the aggregate step).
 */
export async function updateStepDependsOn(
  stepId: string,
  dependsOn: string[],
): Promise<boolean> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  const result = await client.execute({
    sql: `UPDATE screening_run_steps
             SET depends_on = ?, updated_at = ?
           WHERE id = ? AND status = 'pending'`,
    args: [JSON.stringify(dependsOn), now, stepId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/** First step of a given agent_kind for a run (e.g. the Compiler barrier). */
export async function findStepByAgentKind(
  runId: string,
  agentKind: string,
): Promise<ScreeningStepRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM screening_run_steps
           WHERE run_id = ? AND agent_kind = ?
           ORDER BY created_at ASC
           LIMIT 1`,
    args: [runId, agentKind],
  });
  const row = result.rows[0];
  return row ? readStep(row as unknown as Record<string, unknown>) : null;
}

export async function countPendingStepsForRun(runId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM screening_run_steps
           WHERE run_id = ? AND status IN ('pending', 'running')`,
    args: [runId],
  });
  return num((result.rows[0] as unknown as Record<string, unknown>).c);
}

/** Global pending/running count used by the recover cron to decide whether to kick. */
export async function countPendingSteps(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM screening_run_steps
           WHERE status IN ('pending', 'running')`,
    args: [],
  });
  return num((result.rows[0] as unknown as Record<string, unknown>).c);
}

export interface AppendEventParams {
  runId: string;
  stepId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}

export async function appendEvent(
  params: AppendEventParams,
): Promise<ScreeningRunEventRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(params.payload ?? {}).slice(0, 20_000);
  await client.execute({
    sql: `INSERT INTO screening_run_events
            (id, run_id, step_id, event_type, payload_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, params.runId, params.stepId ?? null, params.eventType, payloadJson, now],
  });
  return {
    id,
    runId: params.runId,
    stepId: params.stepId ?? null,
    eventType: params.eventType,
    payloadJson,
    createdAt: now,
  };
}

export async function listEventsForRun(
  runId: string,
  limit = 200,
): Promise<ScreeningRunEventRow[]> {
  const client = await ensureInitialized();
  const capped = Math.min(Math.max(1, limit), 1000);
  const result = await client.execute({
    sql: `SELECT * FROM screening_run_events
           WHERE run_id = ?
           ORDER BY created_at ASC
           LIMIT ?`,
    args: [runId, capped],
  });
  return result.rows.map((r) => readEvent(r as unknown as Record<string, unknown>));
}
