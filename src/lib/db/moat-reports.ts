import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

const MAX_TAGS = 20;
const MAX_TAG_LEN = 32;

/** Normalize tags from API input: lowercase slugs, dedupe, cap count/length. */
export function normalizeMoatReportTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const x of input) {
    if (typeof x !== "string") continue;
    const t = x
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (t.length === 0 || t.length > MAX_TAG_LEN) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function parseTagsColumn(raw: unknown): string[] {
  const s = typeof raw === "string" ? raw : "";
  if (!s || s === "[]") return [];
  try {
    const p = JSON.parse(s) as unknown;
    if (!Array.isArray(p)) return [];
    return normalizeMoatReportTags(p);
  } catch {
    return [];
  }
}

function tagsToJson(tags: string[]): string {
  return JSON.stringify(tags);
}

export interface MoatReport {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  evaluationJson: string;
  aiNarrative: string;
  totalScore: number;
  maxScore: number;
  verdict: string;
  tags: string[];
  createdAt: string;
}

export interface MoatReportSummary {
  id: string;
  symbol: string;
  companyName: string;
  totalScore: number;
  maxScore: number;
  verdict: string;
  hasAiNarrative: boolean;
  tags: string[];
  createdAt: string;
}

export async function saveMoatReport(
  userId: string,
  symbol: string,
  companyName: string,
  evaluationJson: string,
  totalScore: number,
  maxScore: number,
  verdict: string,
  tags: string[] = [],
): Promise<string> {
  const client = await ensureInitialized();
  const tagJson = tagsToJson(normalizeMoatReportTags(tags));
  const today = new Date().toISOString().slice(0, 10);

  // Upsert: dedupe by (user_id, symbol, date) — at most one evaluation per symbol per day.
  const existing = await client.execute({
    sql: `SELECT id FROM moat_reports WHERE user_id = ? AND symbol = ? AND DATE(created_at) = ? LIMIT 1`,
    args: [userId, symbol, today],
  });

  if (existing.rows.length > 0) {
    const existingId = str(existing.rows[0]?.id);
    await client.execute({
      sql: `UPDATE moat_reports
            SET company_name = ?, evaluation_json = ?, total_score = ?, max_score = ?, verdict = ?, tags = ?
            WHERE id = ?`,
      args: [companyName, evaluationJson, totalScore, maxScore, verdict, tagJson, existingId],
    });
    return existingId;
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO moat_reports (id, user_id, symbol, company_name, evaluation_json, total_score, max_score, verdict, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, symbol, companyName, evaluationJson, totalScore, maxScore, verdict, tagJson],
  });
  return id;
}

export async function updateMoatReportAiNarrative(
  reportId: string,
  userId: string,
  aiNarrative: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE moat_reports SET ai_narrative = ? WHERE id = ? AND user_id = ?",
    args: [aiNarrative, reportId, userId],
  });
}

export async function updateMoatReportTags(
  reportId: string,
  userId: string,
  tags: string[],
): Promise<boolean> {
  const client = await ensureInitialized();
  const tagJson = tagsToJson(normalizeMoatReportTags(tags));
  const result = await client.execute({
    sql: "UPDATE moat_reports SET tags = ? WHERE id = ? AND user_id = ?",
    args: [tagJson, reportId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function getMoatReport(
  reportId: string,
  userId: string,
): Promise<MoatReport | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, symbol, company_name, evaluation_json, ai_narrative, total_score, max_score, verdict, created_at, tags
          FROM moat_reports
          WHERE id = ? AND user_id = ?`,
    args: [reportId, userId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: str(row.id),
    userId: str(row.user_id),
    symbol: str(row.symbol),
    companyName: str(row.company_name),
    evaluationJson: str(row.evaluation_json),
    aiNarrative: str(row.ai_narrative),
    totalScore: Number(row.total_score),
    maxScore: Number(row.max_score),
    verdict: str(row.verdict),
    tags: parseTagsColumn(row.tags),
    createdAt: str(row.created_at),
  };
}

export async function listMoatReports(
  userId: string,
  limit = 100,
  requiredTags: string[] = [],
): Promise<MoatReportSummary[]> {
  const client = await ensureInitialized();
  const tags = normalizeMoatReportTags(requiredTags);

  let sql = `SELECT id, symbol, company_name, total_score, max_score, verdict, ai_narrative, created_at, tags
          FROM moat_reports
          WHERE user_id = ?`;
  const args: (string | number)[] = [userId];

  for (const t of tags) {
    sql += ` AND EXISTS (SELECT 1 FROM json_each(moat_reports.tags) AS je WHERE je.value = ?)`;
    args.push(t);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  args.push(limit);

  const result = await client.execute({ sql, args });
  return result.rows.map((row) => ({
    id: str(row.id),
    symbol: str(row.symbol),
    companyName: str(row.company_name),
    totalScore: Number(row.total_score),
    maxScore: Number(row.max_score),
    verdict: str(row.verdict),
    hasAiNarrative: (str(row.ai_narrative) || "").length > 0,
    tags: parseTagsColumn(row.tags),
    createdAt: str(row.created_at),
  }));
}

/** Distinct tag values across all saved reports for a user (for filter chips). */
export async function listDistinctMoatReportTags(userId: string): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT je.value AS tag
          FROM moat_reports mr, json_each(mr.tags) AS je
          WHERE mr.user_id = ?
          ORDER BY tag`,
    args: [userId],
  });
  return result.rows.map((r) => str(r.tag)).filter(Boolean);
}

export async function deleteMoatReport(
  reportId: string,
  userId: string,
): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM moat_reports WHERE id = ? AND user_id = ?",
    args: [reportId, userId],
  });
  return result.rowsAffected > 0;
}
