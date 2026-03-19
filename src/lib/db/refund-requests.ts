import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export interface RefundRequest {
  id: string;
  userId: string;
  reason: string;
  status: RefundRequestStatus;
  adminNote: string;
  resolvedAt: string;
  createdAt: string;
}

export interface RefundRequestWithUser extends RefundRequest {
  userEmail: string;
  userDisplayName: string;
  username: string;
  userLanguage: string;
  userPlan: string;
}

export async function createRefundRequest(input: {
  userId: string;
  reason: string;
}): Promise<RefundRequest> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO refund_requests (id, user_id, reason, status)
          VALUES (?, ?, ?, 'pending')`,
    args: [id, input.userId, input.reason.trim()],
  });

  const created = await getRefundRequestById(id);
  if (!created) throw new Error("Failed to create refund request");
  return created;
}

export async function getRefundRequestById(
  id: string,
): Promise<RefundRequest | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, reason, status, admin_note, resolved_at, created_at
          FROM refund_requests WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function getActiveRefundRequestForUser(
  userId: string,
): Promise<RefundRequest | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, reason, status, admin_note, resolved_at, created_at
          FROM refund_requests
          WHERE user_id = ? AND status = 'pending'
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function listRefundRequestsForAdmin(
  page: number,
  pageSize: number,
): Promise<{ entries: RefundRequestWithUser[]; total: number }> {
  const client = await ensureInitialized();
  const [countResult, result] = await Promise.all([
    client.execute("SELECT COUNT(*) as c FROM refund_requests"),
    client.execute({
      sql: `SELECT
              r.id,
              r.user_id,
              r.reason,
              r.status,
              r.admin_note,
              r.resolved_at,
              r.created_at,
              u.email AS user_email,
              u.display_name AS user_display_name,
              u.username AS username,
              u.plan AS user_plan,
              COALESCE(us.language, 'en') AS user_language
            FROM refund_requests r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN user_settings us ON us.user_id = r.user_id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [pageSize, page * pageSize],
    }),
  ]);

  return {
    entries: result.rows.map((r) => ({
      ...mapRow(r),
      userEmail: str(r.user_email),
      userDisplayName: str(r.user_display_name),
      username: str(r.username),
      userLanguage: str(r.user_language) || "en",
      userPlan: str(r.user_plan) || "free",
    })),
    total: Number(countResult.rows[0]?.c) || 0,
  };
}

export async function updateRefundRequestStatus(
  id: string,
  status: RefundRequestStatus,
  adminNote: string,
): Promise<RefundRequest | null> {
  const client = await ensureInitialized();
  const resolvedAt = status !== "pending" ? new Date().toISOString() : "";
  await client.execute({
    sql: `UPDATE refund_requests
          SET status = ?, admin_note = ?, resolved_at = ?
          WHERE id = ?`,
    args: [status, adminNote, resolvedAt, id],
  });
  return getRefundRequestById(id);
}

function mapRow(r: import("@libsql/client").Row): RefundRequest {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    reason: str(r.reason),
    status: (str(r.status) || "pending") as RefundRequestStatus,
    adminNote: str(r.admin_note),
    resolvedAt: str(r.resolved_at),
    createdAt: str(r.created_at),
  };
}
