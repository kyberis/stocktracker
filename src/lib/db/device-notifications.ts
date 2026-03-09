import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { DeviceNotification } from "@/lib/types";

export async function createDeviceNotification(
  userId: string,
  notification: { title: string; message: string; ticker?: string }
): Promise<DeviceNotification> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO device_notifications (id, user_id, title, message, ticker)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, notification.title, notification.message, notification.ticker || ""],
  });
  return {
    id,
    title: notification.title,
    message: notification.message,
    ticker: notification.ticker || "",
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export async function listUnreadDeviceNotifications(userId: string): Promise<DeviceNotification[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM device_notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 20",
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    title: str(r.title),
    message: str(r.message),
    ticker: str(r.ticker),
    read: num(r.read) === 1,
    createdAt: str(r.created_at),
  }));
}

export async function markDeviceNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const client = await ensureInitialized();
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const result = await client.execute({
      sql: `UPDATE device_notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      args: [userId, ...ids],
    });
    return result.rowsAffected ?? 0;
  }
  const result = await client.execute({
    sql: "UPDATE device_notifications SET read = 1 WHERE user_id = ? AND read = 0",
    args: [userId],
  });
  return result.rowsAffected ?? 0;
}

export async function purgeOldDeviceNotifications(daysOld: number = 30): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM device_notifications WHERE created_at < datetime('now', ?)",
    args: [`-${daysOld} days`],
  });
  return result.rowsAffected ?? 0;
}
