import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

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
): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO moat_reports (id, user_id, symbol, company_name, evaluation_json, total_score, max_score, verdict)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, symbol, companyName, evaluationJson, totalScore, maxScore, verdict],
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

export async function getMoatReport(
  reportId: string,
  userId: string,
): Promise<MoatReport | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, symbol, company_name, evaluation_json, ai_narrative, total_score, max_score, verdict, created_at
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
    createdAt: str(row.created_at),
  };
}

export async function listMoatReports(
  userId: string,
  limit = 20,
): Promise<MoatReportSummary[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, symbol, company_name, total_score, max_score, verdict, ai_narrative, created_at
          FROM moat_reports
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    symbol: str(row.symbol),
    companyName: str(row.company_name),
    totalScore: Number(row.total_score),
    maxScore: Number(row.max_score),
    verdict: str(row.verdict),
    hasAiNarrative: (str(row.ai_narrative) || "").length > 0,
    createdAt: str(row.created_at),
  }));
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
