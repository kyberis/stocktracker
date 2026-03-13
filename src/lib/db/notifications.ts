import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { AppNotification, NotificationType, SubscriptionPlan } from "@/lib/types";

function rowToNotification(r: Record<string, unknown>): AppNotification {
  return {
    id: str(r.id),
    type: str(r.type) as NotificationType,
    title: str(r.title),
    titleEs: str(r.title_es),
    message: str(r.message),
    messageEs: str(r.message_es),
    link: str(r.link),
    linkLabel: str(r.link_label),
    linkLabelEs: str(r.link_label_es),
    read: num(r.read) === 1,
    createdAt: str(r.created_at),
  };
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  titleEs?: string;
  message: string;
  messageEs?: string;
  link?: string;
  linkLabel?: string;
  linkLabelEs?: string;
}

export async function createNotification(
  userId: string,
  input: CreateNotificationInput,
): Promise<AppNotification> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO notifications (id, user_id, type, title, title_es, message, message_es, link, link_label, link_label_es)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      input.type,
      input.title,
      input.titleEs || "",
      input.message,
      input.messageEs || "",
      input.link || "",
      input.linkLabel || "",
      input.linkLabelEs || "",
    ],
  });
  return {
    id,
    type: input.type,
    title: input.title,
    titleEs: input.titleEs || "",
    message: input.message,
    messageEs: input.messageEs || "",
    link: input.link || "",
    linkLabel: input.linkLabel || "",
    linkLabelEs: input.linkLabelEs || "",
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export async function broadcastNotification(
  input: CreateNotificationInput & { targetPlan?: SubscriptionPlan },
): Promise<number> {
  const client = await ensureInitialized();
  const planFilter = input.targetPlan;
  const usersResult = planFilter
    ? await client.execute({ sql: "SELECT id FROM users WHERE plan = ?", args: [planFilter] })
    : await client.execute("SELECT id FROM users");

  if (usersResult.rows.length === 0) return 0;

  const stmts = usersResult.rows.map((row) => ({
    sql: `INSERT INTO notifications (id, user_id, type, title, title_es, message, message_es, link, link_label, link_label_es)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      str(row.id),
      input.type,
      input.title,
      input.titleEs || "",
      input.message,
      input.messageEs || "",
      input.link || "",
      input.linkLabel || "",
      input.linkLabelEs || "",
    ] as (string | number | null)[],
  }));

  await client.batch(stmts, "write");
  return stmts.length;
}

export async function listNotifications(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<AppNotification[]> {
  const client = await ensureInitialized();
  const limit = opts.limit ?? 50;
  const where = opts.unreadOnly ? "AND read = 0" : "";
  const result = await client.execute({
    sql: `SELECT * FROM notifications WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map((r) => rowToNotification(r as unknown as Record<string, unknown>));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read = 0",
    args: [userId],
  });
  return num(result.rows[0]?.cnt) || 0;
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const client = await ensureInitialized();
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const result = await client.execute({
      sql: `UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      args: [userId, ...ids],
    });
    return result.rowsAffected ?? 0;
  }
  const result = await client.execute({
    sql: "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
    args: [userId],
  });
  return result.rowsAffected ?? 0;
}

export async function purgeOldNotifications(daysOld: number = 90): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM notifications WHERE created_at < datetime('now', ?)",
    args: [`-${daysOld} days`],
  });
  return result.rowsAffected ?? 0;
}

export async function listBroadcastHistory(limit: number = 50): Promise<AppNotification[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT DISTINCT title, title_es, message, message_es, type, link, link_label, link_label_es, created_at,
            MIN(id) as id, 0 as read
          FROM notifications WHERE type = 'admin'
          GROUP BY title, title_es, message, message_es, created_at
          ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => rowToNotification(r as unknown as Record<string, unknown>));
}
