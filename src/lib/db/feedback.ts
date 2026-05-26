import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, feedbackStatus, feedbackType } from "./helpers";
import { findUserById } from "./users";

export type FeedbackType = "feedback" | "bug";

export interface FeedbackEntry {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  type: FeedbackType;
  status: "open" | "answered" | "closed";
  adminReply: string;
  createdAt: string;
  repliedAt: string;
  userContext: string;
  linearIssueId: string;
  linearIssueUrl: string;
  autoPipelineAt: string;
  completionEmailDraft: string;
  completionDraftReadyAt: string;
  completionEmailSentAt: string;
  ackEmailSentAt: string;
}

function mapFeedbackRow(r: import("@libsql/client").Row): FeedbackEntry {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    username: str(r.username),
    subject: str(r.subject),
    message: str(r.message),
    type: feedbackType(r.type),
    status: feedbackStatus(r.status),
    adminReply: str(r.admin_reply),
    createdAt: str(r.created_at),
    repliedAt: str(r.replied_at),
    userContext: str(r.user_context),
    linearIssueId: str(r.linear_issue_id),
    linearIssueUrl: str(r.linear_issue_url),
    autoPipelineAt: str(r.auto_pipeline_at),
    completionEmailDraft: str(r.completion_email_draft),
    completionDraftReadyAt: str(r.completion_draft_ready_at),
    completionEmailSentAt: str(r.completion_email_sent_at),
    ackEmailSentAt: str(r.ack_email_sent_at),
  };
}

export async function createFeedback(
  userId: string,
  subject: string,
  message: string,
  type: FeedbackType = "feedback",
  userContext: string = ""
): Promise<FeedbackEntry> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO feedback (id, user_id, subject, message, type, user_context) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, subject, message, type, userContext],
  });
  const user = await findUserById(userId);
  return {
    id,
    userId,
    username: user?.username || "",
    subject,
    message,
    type,
    status: "open",
    adminReply: "",
    createdAt: new Date().toISOString(),
    repliedAt: "",
    userContext,
    linearIssueId: "",
    linearIssueUrl: "",
    autoPipelineAt: "",
    completionEmailDraft: "",
    completionDraftReadyAt: "",
    completionEmailSentAt: "",
    ackEmailSentAt: "",
  };
}

export async function getFeedbackByUser(userId: string): Promise<FeedbackEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT f.*, u.username FROM feedback f
          JOIN users u ON u.id = f.user_id
          WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    args: [userId],
  });
  return result.rows.map((r) => mapFeedbackRow(r));
}

export async function getFeedbackById(id: string): Promise<FeedbackEntry | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT f.*, u.username FROM feedback f
          JOIN users u ON u.id = f.user_id
          WHERE f.id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapFeedbackRow(result.rows[0]);
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT f.*, u.username FROM feedback f
     JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC`
  );
  return result.rows.map(mapFeedbackRow);
}

export async function getAllFeedbackPaginated(page: number, pageSize: number): Promise<{ items: FeedbackEntry[]; total: number }> {
  const client = await ensureInitialized();
  const [countResult, result] = await Promise.all([
    client.execute("SELECT COUNT(*) as cnt FROM feedback"),
    client.execute({
      sql: `SELECT f.*, u.username FROM feedback f
            JOIN users u ON u.id = f.user_id
            ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      args: [pageSize, page * pageSize],
    }),
  ]);
  return {
    items: result.rows.map(mapFeedbackRow),
    total: Number(countResult.rows[0]?.cnt) || 0,
  };
}

export interface ProdOpsFeedbackPreview {
  id: string;
  userId: string;
  username: string;
  subject: string;
  type: FeedbackType;
  status: "open" | "answered" | "closed";
  createdAt: string;
}

export async function getLatestFeedbackEntries(limit = 3): Promise<ProdOpsFeedbackPreview[]> {
  const client = await ensureInitialized();
  const safeLimit = Math.max(1, Math.min(10, Math.trunc(limit || 3)));
  const result = await client.execute({
    sql: `SELECT f.id, f.user_id, f.subject, f.type, f.status, f.created_at, u.username
          FROM feedback f
          JOIN users u ON u.id = f.user_id
          ORDER BY f.created_at DESC
          LIMIT ?`,
    args: [safeLimit],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    userId: str(row.user_id),
    username: str(row.username),
    subject: str(row.subject),
    type: feedbackType(row.type),
    status: feedbackStatus(row.status),
    createdAt: str(row.created_at),
  }));
}

export async function replyToFeedback(
  feedbackId: string,
  reply: string,
  status: "open" | "answered" | "closed"
): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE feedback SET admin_reply = ?, status = ?, replied_at = datetime('now') WHERE id = ?`,
    args: [reply, status, feedbackId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

const PIPELINE_BATCH = 20;

/** Open feedback at least 6h old, not yet processed by the auto pipeline. */
export async function listFeedbackReadyForAutoPipeline(): Promise<FeedbackEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT f.*, u.username FROM feedback f
          JOIN users u ON u.id = f.user_id
          WHERE f.status = 'open'
            AND datetime(f.created_at) <= datetime('now', '-6 hours')
            AND (f.auto_pipeline_at IS NULL OR f.auto_pipeline_at = '')
          ORDER BY f.created_at ASC
          LIMIT ?`,
    args: [PIPELINE_BATCH],
  });
  return result.rows.map(mapFeedbackRow);
}

/** Ack email not sent after pipeline wrote DB (retry send). */
export async function listFeedbackPendingAckEmail(): Promise<FeedbackEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT f.*, u.username FROM feedback f
          JOIN users u ON u.id = f.user_id
          WHERE f.linear_issue_id != ''
            AND f.auto_pipeline_at != ''
            AND (f.ack_email_sent_at IS NULL OR f.ack_email_sent_at = '')
          ORDER BY f.auto_pipeline_at ASC
          LIMIT ?`,
    args: [PIPELINE_BATCH],
  });
  return result.rows.map(mapFeedbackRow);
}

export async function applyFeedbackPipelineDbUpdate(params: {
  feedbackId: string;
  adminReply: string;
  linearIssueId: string;
  linearIssueUrl: string;
}): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE feedback SET
          admin_reply = ?,
          status = 'answered',
          replied_at = datetime('now'),
          linear_issue_id = ?,
          linear_issue_url = ?,
          auto_pipeline_at = datetime('now')
          WHERE id = ?
            AND status = 'open'
            AND (auto_pipeline_at IS NULL OR auto_pipeline_at = '')`,
    args: [params.adminReply, params.linearIssueId, params.linearIssueUrl, params.feedbackId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function markFeedbackAckEmailSent(feedbackId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE feedback SET ack_email_sent_at = datetime('now') WHERE id = ?`,
    args: [feedbackId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/** Set or refresh completion email draft (webhook); does not overwrite after send. */
export async function upsertFeedbackCompletionDraft(params: {
  feedbackId: string;
  draftHtml: string;
}): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE feedback SET
          completion_email_draft = ?,
          completion_draft_ready_at = datetime('now')
          WHERE id = ?
            AND (completion_email_sent_at IS NULL OR completion_email_sent_at = '')`,
    args: [params.draftHtml, params.feedbackId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function markFeedbackCompletionEmailSent(feedbackId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE feedback SET completion_email_sent_at = datetime('now') WHERE id = ?`,
    args: [feedbackId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export function parseFeedbackIdFromLinearContent(title: string, description: string): string | null {
  const combined = `${title}\n${description}`;
  const m1 = combined.match(/\[feedback-([a-f0-9-]{36})\]/i);
  if (m1) return m1[1];
  const m2 = combined.match(/<!--\s*feedback-id:([a-f0-9-]{36})\s*-->/i);
  if (m2) return m2[1];
  return null;
}
