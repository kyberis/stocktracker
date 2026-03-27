import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export type SatisfactionStatus = "draft" | "submitted";

export interface SatisfactionSurvey {
  id: string;
  userId: string;
  username: string;
  email: string;
  plan: string;
  rating: number;
  comment: string;
  status: SatisfactionStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
}

export interface SatisfactionStats {
  total: number;
  submitted: number;
  drafts: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export interface SatisfactionEligibility {
  eligible: boolean;
  draft: SatisfactionSurvey | null;
}

function satisfactionStatus(val: unknown): SatisfactionStatus {
  const v = String(val);
  if (v === "submitted") return "submitted";
  return "draft";
}

function mapRow(r: import("@libsql/client").Row): SatisfactionSurvey {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    username: str(r.username),
    email: str(r.email),
    plan: str(r.plan),
    rating: num(r.rating),
    comment: str(r.comment),
    status: satisfactionStatus(r.status),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    submittedAt: str(r.submitted_at),
  };
}

export async function createOrUpdateDraft(
  userId: string,
  rating: number,
  comment?: string,
): Promise<SatisfactionSurvey> {
  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT id FROM satisfaction_surveys WHERE user_id = ? AND status = 'draft' LIMIT 1",
    args: [userId],
  });

  if (existing.rows.length > 0) {
    const id = str(existing.rows[0].id);
    const setClauses = ["rating = ?", "updated_at = datetime('now')"];
    const args: (string | number)[] = [rating];
    if (comment !== undefined) {
      setClauses.push("comment = ?");
      args.push(comment);
    }
    args.push(id);
    await client.execute({
      sql: `UPDATE satisfaction_surveys SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });
    return getSurveyById(id) as Promise<SatisfactionSurvey>;
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO satisfaction_surveys (id, user_id, rating, comment, status)
          VALUES (?, ?, ?, ?, 'draft')`,
    args: [id, userId, rating, comment ?? ""],
  });
  return getSurveyById(id) as Promise<SatisfactionSurvey>;
}

async function getSurveyById(id: string): Promise<SatisfactionSurvey | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT s.*, u.username, u.email, u.plan FROM satisfaction_surveys s
          JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function getSurveyByUser(userId: string): Promise<SatisfactionSurvey | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT s.*, u.username, u.email, u.plan FROM satisfaction_surveys s
          JOIN users u ON u.id = s.user_id
          WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1`,
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function submitSurvey(userId: string): Promise<SatisfactionSurvey | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE satisfaction_surveys
          SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now')
          WHERE user_id = ? AND status = 'draft'`,
    args: [userId],
  });
  if ((result.rowsAffected ?? 0) === 0) return null;

  await client.execute({
    sql: "UPDATE users SET satisfaction_completed = 1 WHERE id = ?",
    args: [userId],
  });

  return getSurveyByUser(userId);
}

export async function dismissSurvey(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE users SET satisfaction_dismiss_count = satisfaction_dismiss_count + 1,
          satisfaction_interaction_count = 0 WHERE id = ?`,
    args: [userId],
  });
  await client.execute({
    sql: "DELETE FROM satisfaction_surveys WHERE user_id = ? AND status = 'draft'",
    args: [userId],
  });
}

const FIRST_THRESHOLD = 8;
const REPEAT_THRESHOLD = 15;
const MAX_DISMISSALS = 3;
const MIN_ACCOUNT_AGE_DAYS = 3;

export async function checkEligibility(userId: string): Promise<SatisfactionEligibility> {
  const client = await ensureInitialized();

  const userResult = await client.execute({
    sql: `SELECT satisfaction_completed, satisfaction_dismiss_count,
                 satisfaction_interaction_count, created_at
          FROM users WHERE id = ?`,
    args: [userId],
  });
  if (userResult.rows.length === 0) return { eligible: false, draft: null };

  const row = userResult.rows[0];
  const completed = num(row.satisfaction_completed) === 1;
  const dismissCount = num(row.satisfaction_dismiss_count);
  const interactionCount = num(row.satisfaction_interaction_count);
  const createdAt = str(row.created_at);

  if (completed) return { eligible: false, draft: null };
  if (dismissCount >= MAX_DISMISSALS) return { eligible: false, draft: null };

  const accountAge = Date.now() - new Date(createdAt).getTime();
  if (accountAge < MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return { eligible: false, draft: null };
  }

  const existingDraft = await getSurveyByUser(userId);
  if (existingDraft?.status === "submitted") return { eligible: false, draft: null };
  if (existingDraft?.status === "draft") return { eligible: true, draft: existingDraft };

  const threshold = dismissCount === 0 ? FIRST_THRESHOLD : REPEAT_THRESHOLD;
  if (interactionCount < threshold) return { eligible: false, draft: null };

  return { eligible: true, draft: null };
}

export async function incrementInteractionCount(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET satisfaction_interaction_count = satisfaction_interaction_count + 1 WHERE id = ? AND satisfaction_completed = 0",
    args: [userId],
  });
}

export async function getAllSurveysPaginated(
  page: number,
  pageSize: number,
  statusFilter?: SatisfactionStatus,
): Promise<{ items: SatisfactionSurvey[]; total: number; stats: SatisfactionStats }> {
  const client = await ensureInitialized();

  const whereClause = statusFilter ? "WHERE s.status = ?" : "";
  const filterArgs = statusFilter ? [statusFilter] : [];

  const [countResult, result, statsResult, distResult] = await Promise.all([
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM satisfaction_surveys s ${whereClause}`,
      args: filterArgs,
    }),
    client.execute({
      sql: `SELECT s.*, u.username, u.email, u.plan FROM satisfaction_surveys s
            JOIN users u ON u.id = s.user_id
            ${whereClause}
            ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`,
      args: [...filterArgs, pageSize, page * pageSize],
    }),
    client.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
        AVG(CASE WHEN status = 'submitted' THEN rating ELSE NULL END) as avg_rating
      FROM satisfaction_surveys
    `),
    client.execute(`
      SELECT rating, COUNT(*) as cnt FROM satisfaction_surveys
      WHERE status = 'submitted' GROUP BY rating ORDER BY rating
    `),
  ]);

  const distribution: Record<number, number> = {};
  for (const r of distResult.rows) {
    distribution[num(r.rating)] = num(r.cnt);
  }

  return {
    items: result.rows.map(mapRow),
    total: num(countResult.rows[0]?.cnt),
    stats: {
      total: num(statsResult.rows[0]?.total),
      submitted: num(statsResult.rows[0]?.submitted),
      drafts: num(statsResult.rows[0]?.drafts),
      averageRating: Math.round(num(statsResult.rows[0]?.avg_rating) * 10) / 10,
      ratingDistribution: distribution,
    },
  };
}
