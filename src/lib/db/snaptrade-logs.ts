import { randomUUID } from "crypto";
import type { InValue } from "@libsql/client";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

const MAX_RESPONSE_BODY_BYTES = 500_000;

export interface SnapTradeLogEntry {
  id: string;
  userId: string;
  action: string;
  status: string;
  requestSummary: string;
  responseBody: string;
  errorMessage: string;
  durationMs: number;
  createdAt: string;
}

export interface InsertSnapTradeLogParams {
  userId: string;
  action: string;
  status: "success" | "error";
  requestSummary?: Record<string, unknown>;
  responseBody?: unknown;
  errorMessage?: string;
  durationMs: number;
}

export async function insertSnapTradeLog(params: InsertSnapTradeLogParams): Promise<void> {
  try {
    const client = await ensureInitialized();
    let body = "{}";
    try {
      body = JSON.stringify(params.responseBody ?? {});
      if (body.length > MAX_RESPONSE_BODY_BYTES) {
        body = body.slice(0, MAX_RESPONSE_BODY_BYTES) + '..."[truncated]"}';
      }
    } catch {
      body = '{"_error":"could not serialize response"}';
    }

    await client.execute({
      sql: `INSERT INTO snaptrade_api_logs
              (id, user_id, action, status, request_summary, response_body, error_message, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        params.userId,
        params.action,
        params.status,
        JSON.stringify(params.requestSummary ?? {}),
        body,
        params.errorMessage ?? "",
        params.durationMs,
      ],
    });
  } catch (err) {
    console.error("[snaptrade-logs] Failed to insert log:", err instanceof Error ? err.message : err);
  }
}

export interface GetSnapTradeLogsOptions {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
}

export async function getRecentSnapTradeLogs(
  opts: GetSnapTradeLogsOptions = {},
): Promise<{ logs: SnapTradeLogEntry[]; total: number }> {
  const client = await ensureInitialized();
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const conditions: string[] = [];
  const args: InValue[] = [];

  if (opts.userId) {
    conditions.push("user_id = ?");
    args.push(opts.userId);
  }
  if (opts.action) {
    conditions.push("action = ?");
    args.push(opts.action);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM snaptrade_api_logs ${where}`,
    args,
  });
  const total = num(countResult.rows[0]?.cnt);

  const logsResult = await client.execute({
    sql: `SELECT id, user_id, action, status, request_summary, response_body, error_message, duration_ms, created_at
          FROM snaptrade_api_logs ${where}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const logs: SnapTradeLogEntry[] = logsResult.rows.map((r) => ({
    id: str(r.id),
    userId: str(r.user_id),
    action: str(r.action),
    status: str(r.status),
    requestSummary: str(r.request_summary),
    responseBody: str(r.response_body),
    errorMessage: str(r.error_message),
    durationMs: num(r.duration_ms),
    createdAt: str(r.created_at),
  }));

  return { logs, total };
}

export async function pruneOldSnapTradeLogs(olderThanDays = 30): Promise<number> {
  try {
    const client = await ensureInitialized();
    const result = await client.execute({
      sql: `DELETE FROM snaptrade_api_logs WHERE created_at < datetime('now', ?)`,
      args: [`-${olderThanDays} days`],
    });
    return result.rowsAffected;
  } catch (err) {
    console.error("[snaptrade-logs] Failed to prune old logs:", err instanceof Error ? err.message : err);
    return 0;
  }
}
