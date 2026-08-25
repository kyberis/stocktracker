import { randomBytes, randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { num, str } from "./helpers";
import type { SurveyQuestionDraft, SurveyTemplateId } from "@/lib/engagement-report/templates";

export type SurveyCampaignStatus = "draft" | "confirmed" | "sending" | "sent" | "cancelled";
export type SurveyInviteEmailStatus = "pending" | "sent" | "suppressed" | "failed" | "skipped";

export interface SurveyCampaign {
  id: string;
  templateId: SurveyTemplateId;
  title: string;
  rationale: string;
  status: SurveyCampaignStatus;
  reportId: string | null;
  createdBy: string;
  createdAt: string;
  confirmedAt: string | null;
  sentAt: string | null;
  questionsEnJson: string;
  questionsEsJson: string;
}

export interface SurveyInvite {
  id: string;
  campaignId: string;
  userId: string;
  token: string;
  language: string;
  questionsJson: string;
  emailStatus: SurveyInviteEmailStatus;
  openedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  username?: string;
  email?: string;
}

export interface SurveyResponseRow {
  id: string;
  inviteId: string;
  userId: string;
  answersJson: string;
  npsScore: number | null;
  submittedAt: string;
  username?: string;
  email?: string;
  templateId?: string;
  campaignTitle?: string;
}

function campaignStatus(v: unknown): SurveyCampaignStatus {
  const s = String(v);
  if (s === "confirmed" || s === "sending" || s === "sent" || s === "cancelled") return s;
  return "draft";
}

function emailStatus(v: unknown): SurveyInviteEmailStatus {
  const s = String(v);
  if (s === "sent" || s === "suppressed" || s === "failed" || s === "skipped") return s;
  return "pending";
}

function mapCampaign(r: import("@libsql/client").Row): SurveyCampaign {
  return {
    id: str(r.id),
    templateId: str(r.template_id) as SurveyTemplateId,
    title: str(r.title),
    rationale: str(r.rationale),
    status: campaignStatus(r.status),
    reportId: str(r.report_id) || null,
    createdBy: str(r.created_by),
    createdAt: str(r.created_at),
    confirmedAt: str(r.confirmed_at) || null,
    sentAt: str(r.sent_at) || null,
    questionsEnJson: str(r.questions_en_json),
    questionsEsJson: str(r.questions_es_json),
  };
}

function mapInvite(r: import("@libsql/client").Row): SurveyInvite {
  return {
    id: str(r.id),
    campaignId: str(r.campaign_id),
    userId: str(r.user_id),
    token: str(r.token),
    language: str(r.language) || "en",
    questionsJson: str(r.questions_json),
    emailStatus: emailStatus(r.email_status),
    openedAt: str(r.opened_at) || null,
    completedAt: str(r.completed_at) || null,
    createdAt: str(r.created_at),
    username: r.username != null ? str(r.username) : undefined,
    email: r.email != null ? str(r.email) : undefined,
  };
}

export function newSurveyToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createSurveyCampaign(input: {
  templateId: SurveyTemplateId;
  title: string;
  rationale: string;
  reportId?: string | null;
  createdBy: string;
  questionsEn: SurveyQuestionDraft[];
  questionsEs: SurveyQuestionDraft[];
  targets: { userId: string; language: string; questions: SurveyQuestionDraft[] }[];
}): Promise<{ campaign: SurveyCampaign; invites: SurveyInvite[] }> {
  const client = await ensureInitialized();
  const campaignId = randomUUID();
  await client.execute({
    sql: `INSERT INTO survey_campaigns
          (id, template_id, title, rationale, status, report_id, created_by, questions_en_json, questions_es_json)
          VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    args: [
      campaignId,
      input.templateId,
      input.title,
      input.rationale,
      input.reportId || null,
      input.createdBy,
      JSON.stringify(input.questionsEn),
      JSON.stringify(input.questionsEs),
    ],
  });

  const invites: SurveyInvite[] = [];
  for (const t of input.targets) {
    const inviteId = randomUUID();
    const token = newSurveyToken();
    await client.execute({
      sql: `INSERT INTO survey_invites
            (id, campaign_id, user_id, token, language, questions_json, email_status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      args: [inviteId, campaignId, t.userId, token, t.language, JSON.stringify(t.questions)],
    });
    invites.push({
      id: inviteId,
      campaignId,
      userId: t.userId,
      token,
      language: t.language,
      questionsJson: JSON.stringify(t.questions),
      emailStatus: "pending",
      openedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  const campaign = await getSurveyCampaign(campaignId);
  if (!campaign) throw new Error("Failed to create survey campaign");
  return { campaign, invites };
}

export async function getSurveyCampaign(id: string): Promise<SurveyCampaign | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM survey_campaigns WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapCampaign(result.rows[0]);
}

export async function listSurveyCampaigns(limit = 50): Promise<(SurveyCampaign & { inviteCount: number; responseCount: number })[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT c.*,
            (SELECT COUNT(*) FROM survey_invites i WHERE i.campaign_id = c.id) as invite_count,
            (SELECT COUNT(*) FROM survey_responses r
              JOIN survey_invites i ON i.id = r.invite_id WHERE i.campaign_id = c.id) as response_count
          FROM survey_campaigns c
          ORDER BY c.created_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => ({
    ...mapCampaign(r),
    inviteCount: num(r.invite_count),
    responseCount: num(r.response_count),
  }));
}

export async function confirmSurveyCampaign(id: string): Promise<SurveyCampaign | null> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE survey_campaigns
          SET status = 'confirmed', confirmed_at = datetime('now')
          WHERE id = ? AND status IN ('draft', 'confirmed')`,
    args: [id],
  });
  return getSurveyCampaign(id);
}

export async function setSurveyCampaignStatus(
  id: string,
  status: SurveyCampaignStatus,
): Promise<void> {
  const client = await ensureInitialized();
  const sentClause = status === "sent" ? ", sent_at = datetime('now')" : "";
  await client.execute({
    sql: `UPDATE survey_campaigns SET status = ?${sentClause} WHERE id = ?`,
    args: [status, id],
  });
}

export async function listSurveyInvites(campaignId: string): Promise<SurveyInvite[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT i.*, u.username, u.email
          FROM survey_invites i
          JOIN users u ON u.id = i.user_id
          WHERE i.campaign_id = ?
          ORDER BY u.username ASC`,
    args: [campaignId],
  });
  return result.rows.map(mapInvite);
}

export async function updateInviteEmailStatus(
  inviteId: string,
  status: SurveyInviteEmailStatus,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE survey_invites SET email_status = ? WHERE id = ?",
    args: [status, inviteId],
  });
}

export async function getSurveyInviteByToken(token: string): Promise<(SurveyInvite & {
  campaignTitle: string;
  templateId: SurveyTemplateId;
  campaignStatus: SurveyCampaignStatus;
}) | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT i.*, c.title as campaign_title, c.template_id, c.status as campaign_status,
                 u.username, u.email
          FROM survey_invites i
          JOIN survey_campaigns c ON c.id = i.campaign_id
          JOIN users u ON u.id = i.user_id
          WHERE i.token = ?`,
    args: [token],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    ...mapInvite(r),
    campaignTitle: str(r.campaign_title),
    templateId: str(r.template_id) as SurveyTemplateId,
    campaignStatus: campaignStatus(r.campaign_status),
  };
}

export async function markSurveyInviteOpened(token: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE survey_invites SET opened_at = COALESCE(opened_at, datetime('now')) WHERE token = ?`,
    args: [token],
  });
}

export async function submitSurveyResponse(input: {
  inviteId: string;
  userId: string;
  answers: Record<string, unknown>;
  npsScore?: number | null;
}): Promise<SurveyResponseRow> {
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT id FROM survey_responses WHERE invite_id = ?",
    args: [input.inviteId],
  });
  if (existing.rows.length > 0) {
    throw new Error("ALREADY_SUBMITTED");
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO survey_responses (id, invite_id, user_id, answers_json, nps_score)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      id,
      input.inviteId,
      input.userId,
      JSON.stringify(input.answers),
      input.npsScore ?? null,
    ],
  });
  await client.execute({
    sql: `UPDATE survey_invites SET completed_at = datetime('now') WHERE id = ?`,
    args: [input.inviteId],
  });

  return {
    id,
    inviteId: input.inviteId,
    userId: input.userId,
    answersJson: JSON.stringify(input.answers),
    npsScore: input.npsScore ?? null,
    submittedAt: new Date().toISOString(),
  };
}

export async function listSurveyResponses(limit = 100): Promise<SurveyResponseRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT r.*, u.username, u.email, c.template_id, c.title as campaign_title
          FROM survey_responses r
          JOIN users u ON u.id = r.user_id
          JOIN survey_invites i ON i.id = r.invite_id
          JOIN survey_campaigns c ON c.id = i.campaign_id
          ORDER BY r.submitted_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    inviteId: str(r.invite_id),
    userId: str(r.user_id),
    answersJson: str(r.answers_json),
    npsScore: r.nps_score == null || r.nps_score === "" ? null : num(r.nps_score),
    submittedAt: str(r.submitted_at),
    username: str(r.username),
    email: str(r.email),
    templateId: str(r.template_id),
    campaignTitle: str(r.campaign_title),
  }));
}

export async function listSurveyDataForUserExport(userId: string): Promise<{
  invites: Record<string, unknown>[];
  responses: Record<string, unknown>[];
}> {
  const client = await ensureInitialized();
  const invites = await client.execute({
    sql: `SELECT id, campaign_id, language, email_status, opened_at, completed_at, created_at
          FROM survey_invites WHERE user_id = ?`,
    args: [userId],
  });
  const responses = await client.execute({
    sql: `SELECT id, invite_id, answers_json, nps_score, submitted_at
          FROM survey_responses WHERE user_id = ?`,
    args: [userId],
  });
  return {
    invites: invites.rows as unknown as Record<string, unknown>[],
    responses: responses.rows as unknown as Record<string, unknown>[],
  };
}
