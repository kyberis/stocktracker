import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { str, num } from "@/lib/db/helpers";

/* ── DB helpers for cron_executions table ── */

async function insertCronExecution(id: string, jobName: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "INSERT INTO cron_executions (id, job_name) VALUES (?, ?)",
    args: [id, jobName],
  });
}

async function finishCronExecution(
  id: string,
  status: "success" | "error",
  result: Record<string, unknown>,
  durationMs: number,
  errorMessage = "",
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE cron_executions SET finished_at = datetime('now'), status = ?, result = ?, error_message = ?, duration_ms = ? WHERE id = ?",
    args: [status, JSON.stringify(result), errorMessage, durationMs, id],
  });
}

/* ── Public: wrap a cron handler for automatic logging ── */

export function withCronLogging(
  jobName: string,
  handler: () => Promise<Record<string, unknown>>,
) {
  return async () => {
    const execId = randomUUID();
    const start = Date.now();
    console.info(`[cron:${jobName}] Starting (exec=${execId})`);
    try {
      await insertCronExecution(execId, jobName);
    } catch (err) {
      console.error(`[cron:${jobName}] Failed to insert cron execution log:`, err);
    }
    try {
      const result = await handler();
      const elapsed = Date.now() - start;
      console.info(`[cron:${jobName}] OK ${elapsed}ms`, JSON.stringify(result));
      try {
        await finishCronExecution(execId, "success", result, elapsed);
      } catch (logErr) {
        console.error(`[cron:${jobName}] Failed to finish cron execution log:`, logErr);
      }
      return NextResponse.json(result);
    } catch (err) {
      const elapsed = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await finishCronExecution(execId, "error", {}, elapsed, msg);
      } catch (logErr) {
        console.error(`[cron:${jobName}] Failed to log cron error:`, logErr);
      }
      console.error(`[cron:${jobName}] FAILED ${elapsed}ms:`, msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

/* ── Auth helper for cron routes ── */

export function verifyCronAuth(jobName: string, authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn(
      `[cron:${jobName}] 401 — ${!authHeader ? "missing Authorization header" : "secret mismatch"}`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/* ── Admin: query cron execution stats ── */

export interface CronJobStats {
  jobName: string;
  totalRuns: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string;
  lastStatus: string;
}

export interface CronExecution {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  result: string;
  errorMessage: string;
  durationMs: number;
}

export async function getCronStats(): Promise<{ stats: CronJobStats[]; recent: CronExecution[] }> {
  const client = await ensureInitialized();

  const statsResult = await client.execute({
    sql: `SELECT
      job_name,
      COUNT(*) as total_runs,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
      AVG(duration_ms) as avg_duration_ms,
      MAX(started_at) as last_run_at
    FROM cron_executions
    GROUP BY job_name
    ORDER BY last_run_at DESC`,
    args: [],
  });

  const stats: CronJobStats[] = statsResult.rows.map((r) => {
    const totalRuns = num(r.total_runs);
    const successCount = num(r.success_count);
    return {
      jobName: str(r.job_name),
      totalRuns,
      successCount,
      errorCount: num(r.error_count),
      successRate: totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0,
      avgDurationMs: Math.round(num(r.avg_duration_ms)),
      lastRunAt: str(r.last_run_at),
      lastStatus: "",
    };
  });

  // Fill lastStatus from the most recent execution per job
  for (const stat of stats) {
    const lastExec = await client.execute({
      sql: "SELECT status FROM cron_executions WHERE job_name = ? ORDER BY started_at DESC LIMIT 1",
      args: [stat.jobName],
    });
    if (lastExec.rows.length > 0) {
      stat.lastStatus = str(lastExec.rows[0].status);
    }
  }

  const recentResult = await client.execute({
    sql: "SELECT id, job_name, started_at, finished_at, status, result, error_message, duration_ms FROM cron_executions ORDER BY started_at DESC LIMIT 50",
    args: [],
  });

  const recent: CronExecution[] = recentResult.rows.map((r) => ({
    id: str(r.id),
    jobName: str(r.job_name),
    startedAt: str(r.started_at),
    finishedAt: str(r.finished_at),
    status: str(r.status),
    result: str(r.result),
    errorMessage: str(r.error_message),
    durationMs: num(r.duration_ms),
  }));

  return { stats, recent };
}
