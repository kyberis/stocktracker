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
  return result.rows.map((r) => ({
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
  }));
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
  };
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
