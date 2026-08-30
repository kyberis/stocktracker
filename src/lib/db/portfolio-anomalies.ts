import { randomUUID } from "crypto";

import type {
  PortfolioAnomaly,
  PortfolioAnomalyFinding,
  PortfolioAnomalyResolvedBy,
  PortfolioAnomalySeverity,
  PortfolioAnomalyStatus,
} from "@/lib/types";

import { ensureInitialized } from "./client";
import { str } from "./helpers";

function parseJsonArray<T>(raw: unknown): T[] {
  try {
    const parsed = JSON.parse(String(raw || "[]")) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mapRow(row: import("@libsql/client").Row): PortfolioAnomaly {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    status: (str(row.status) || "open") as PortfolioAnomalyStatus,
    severity: (str(row.severity) || "warn") as PortfolioAnomalySeverity,
    codes: parseJsonArray<string>(row.codes_json),
    findings: parseJsonArray<PortfolioAnomalyFinding>(row.findings_json),
    aiExplanation: str(row.ai_explanation),
    remediationPrompt: str(row.remediation_prompt),
    fingerprint: str(row.fingerprint),
    notifiedAt: str(row.notified_at),
    resolvedAt: str(row.resolved_at),
    resolvedBy: (str(row.resolved_by) || "") as PortfolioAnomalyResolvedBy,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export async function getPortfolioAnomalyById(id: string): Promise<PortfolioAnomaly | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM portfolio_anomalies WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function findOpenPortfolioAnomalyByFingerprint(
  userId: string,
  fingerprint: string,
): Promise<PortfolioAnomaly | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM portfolio_anomalies
          WHERE user_id = ? AND fingerprint = ? AND status IN ('open', 'acked')
          ORDER BY updated_at DESC LIMIT 1`,
    args: [userId, fingerprint],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function listPortfolioAnomalies(opts: {
  status?: PortfolioAnomalyStatus | "all" | "active" | "resolved";
  severity?: PortfolioAnomalySeverity | "all";
  code?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: PortfolioAnomaly[]; total: number }> {
  const client = await ensureInitialized();
  const where: string[] = [];
  const args: Array<string | number> = [];

  if (opts.status === "active") {
    where.push("status IN ('open', 'acked')");
  } else if (opts.status === "resolved") {
    where.push("status IN ('fixed', 'dismissed')");
  } else if (opts.status && opts.status !== "all") {
    where.push("status = ?");
    args.push(opts.status);
  }
  if (opts.severity && opts.severity !== "all") {
    where.push("severity = ?");
    args.push(opts.severity);
  }
  if (opts.code) {
    where.push("codes_json LIKE ?");
    args.push(`%${opts.code}%`);
  }
  if (opts.userId) {
    where.push("user_id = ?");
    args.push(opts.userId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM portfolio_anomalies ${whereSql}`,
    args,
  });
  const total = Number(countResult.rows[0]?.cnt || 0);

  const result = await client.execute({
    sql: `SELECT * FROM portfolio_anomalies ${whereSql}
          ORDER BY
            CASE status WHEN 'open' THEN 0 WHEN 'acked' THEN 1 WHEN 'fixed' THEN 2 ELSE 3 END,
            CASE severity WHEN 'error' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END,
            updated_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return { items: result.rows.map(mapRow), total };
}

/** Counts by triage bucket for admin filters. */
export async function countPortfolioAnomaliesByStatus(): Promise<{
  active: number;
  open: number;
  acked: number;
  fixed: number;
  dismissed: number;
  resolved: number;
  all: number;
}> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT status, COUNT(*) as c FROM portfolio_anomalies GROUP BY status`,
    args: [],
  });
  const counts = {
    active: 0,
    open: 0,
    acked: 0,
    fixed: 0,
    dismissed: 0,
    resolved: 0,
    all: 0,
  };
  for (const row of result.rows) {
    const status = str(row.status);
    const c = Number(row.c || 0);
    counts.all += c;
    if (status === "open") counts.open = c;
    else if (status === "acked") counts.acked = c;
    else if (status === "fixed") counts.fixed = c;
    else if (status === "dismissed") counts.dismissed = c;
  }
  counts.active = counts.open + counts.acked;
  counts.resolved = counts.fixed + counts.dismissed;
  return counts;
}

export async function countOpenPortfolioAnomaliesForUser(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM portfolio_anomalies
          WHERE user_id = ? AND status IN ('open', 'acked')`,
    args: [userId],
  });
  return Number(result.rows[0]?.cnt || 0);
}

export async function createPortfolioAnomaly(input: {
  userId: string;
  severity: PortfolioAnomalySeverity;
  codes: string[];
  findings: PortfolioAnomalyFinding[];
  aiExplanation: string;
  remediationPrompt: string;
  fingerprint: string;
}): Promise<PortfolioAnomaly> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO portfolio_anomalies (
            id, user_id, status, severity, codes_json, findings_json,
            ai_explanation, remediation_prompt, fingerprint
          ) VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.userId,
      input.severity,
      JSON.stringify(input.codes),
      JSON.stringify(input.findings),
      input.aiExplanation,
      input.remediationPrompt,
      input.fingerprint,
    ],
  });
  const created = await getPortfolioAnomalyById(id);
  if (!created) throw new Error("failed_to_create_portfolio_anomaly");
  return created;
}

export async function updatePortfolioAnomalyFindings(
  id: string,
  input: {
    severity: PortfolioAnomalySeverity;
    codes: string[];
    findings: PortfolioAnomalyFinding[];
    aiExplanation?: string;
    remediationPrompt?: string;
  },
): Promise<PortfolioAnomaly | null> {
  const client = await ensureInitialized();
  const existing = await getPortfolioAnomalyById(id);
  if (!existing) return null;

  await client.execute({
    sql: `UPDATE portfolio_anomalies SET
            severity = ?,
            codes_json = ?,
            findings_json = ?,
            ai_explanation = ?,
            remediation_prompt = ?,
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      input.severity,
      JSON.stringify(input.codes),
      JSON.stringify(input.findings),
      input.aiExplanation ?? existing.aiExplanation,
      input.remediationPrompt ?? existing.remediationPrompt,
      id,
    ],
  });
  return getPortfolioAnomalyById(id);
}

export async function markPortfolioAnomalyNotified(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE portfolio_anomalies
          SET notified_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?`,
    args: [id],
  });
}

export async function setPortfolioAnomalyStatus(
  id: string,
  status: PortfolioAnomalyStatus,
  resolvedBy: PortfolioAnomalyResolvedBy = "",
): Promise<PortfolioAnomaly | null> {
  const client = await ensureInitialized();
  const terminal = status === "fixed" || status === "dismissed";
  await client.execute({
    sql: `UPDATE portfolio_anomalies SET
            status = ?,
            resolved_at = CASE WHEN ? THEN datetime('now') ELSE resolved_at END,
            resolved_by = CASE WHEN ? THEN ? ELSE resolved_by END,
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [status, terminal ? 1 : 0, terminal ? 1 : 0, resolvedBy, id],
  });
  return getPortfolioAnomalyById(id);
}
