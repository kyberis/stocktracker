import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { EngagementSnapshot } from "@/lib/engagement-report/snapshot";
import type { AiReportOutput } from "@/lib/engagement-report/generate";

export interface EngagementReportRow {
  id: string;
  periodDays: number;
  snapshotJson: string;
  html: string;
  surveyProposalsJson: string;
  narrativeJson: string;
  createdBy: string;
  createdAt: string;
  usedFallback: boolean;
  model: string;
}

export interface EngagementReportSummary {
  id: string;
  periodDays: number;
  createdBy: string;
  createdAt: string;
  usedFallback: boolean;
  model: string;
  proposalCount: number;
}

function mapRow(r: import("@libsql/client").Row): EngagementReportRow {
  return {
    id: str(r.id),
    periodDays: Number(r.period_days) || 30,
    snapshotJson: str(r.snapshot_json),
    html: str(r.html),
    surveyProposalsJson: str(r.survey_proposals_json),
    narrativeJson: str(r.narrative_json),
    createdBy: str(r.created_by),
    createdAt: str(r.created_at),
    usedFallback: Number(r.used_fallback) === 1,
    model: str(r.model),
  };
}

export async function insertEngagementReport(input: {
  periodDays: number;
  snapshot: EngagementSnapshot;
  html: string;
  ai: AiReportOutput;
  createdBy: string;
  usedFallback: boolean;
  model: string;
}): Promise<EngagementReportRow> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO engagement_reports
          (id, period_days, snapshot_json, html, survey_proposals_json, narrative_json, created_by, used_fallback, model)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.periodDays,
      JSON.stringify(input.snapshot),
      input.html,
      JSON.stringify(input.ai.surveyProposals),
      JSON.stringify({
        narrativeSections: input.ai.narrativeSections,
        insights: input.ai.insights,
        recommendations: input.ai.recommendations,
      }),
      input.createdBy,
      input.usedFallback ? 1 : 0,
      input.model,
    ],
  });
  const row = await getEngagementReport(id);
  if (!row) throw new Error("Failed to read engagement report after insert");
  return row;
}

export async function getEngagementReport(id: string): Promise<EngagementReportRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM engagement_reports WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function listEngagementReports(limit = 20): Promise<EngagementReportSummary[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, period_days, created_by, created_at, used_fallback, model, survey_proposals_json
          FROM engagement_reports ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => {
    let proposalCount = 0;
    try {
      const parsed = JSON.parse(str(r.survey_proposals_json));
      if (Array.isArray(parsed)) proposalCount = parsed.length;
    } catch {
      proposalCount = 0;
    }
    return {
      id: str(r.id),
      periodDays: Number(r.period_days) || 30,
      createdBy: str(r.created_by),
      createdAt: str(r.created_at),
      usedFallback: Number(r.used_fallback) === 1,
      model: str(r.model),
      proposalCount,
    };
  });
}
