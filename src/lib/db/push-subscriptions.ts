import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { PushSubscription } from "@/lib/types";

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }
): Promise<PushSubscription> {
  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
    args: [userId, sub.endpoint],
  });
  if (existing.rows.length > 0) {
    const id = str(existing.rows[0].id);
    await client.execute({
      sql: "UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_agent = ? WHERE id = ?",
      args: [sub.p256dh, sub.auth, sub.userAgent || "", id],
    });
    return { id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent || "", createdAt: "" };
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, sub.endpoint, sub.p256dh, sub.auth, sub.userAgent || ""],
  });
  return { id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent || "", createdAt: new Date().toISOString() };
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
    args: [userId, endpoint],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM push_subscriptions WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    endpoint: str(r.endpoint),
    p256dh: str(r.p256dh),
    auth: str(r.auth),
    userAgent: str(r.user_agent),
    createdAt: str(r.created_at),
  }));
}
