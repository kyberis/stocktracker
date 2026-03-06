import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, alertCondition } from "./helpers";
import type { PriceAlert } from "@/lib/types";

export async function listAlerts(userId: string): Promise<PriceAlert[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    ticker: str(r.ticker),
    name: str(r.name),
    condition: alertCondition(r.condition),
    threshold: num(r.threshold),
    currency: str(r.currency),
    active: num(r.active) === 1,
    triggered: num(r.triggered) === 1,
    triggeredAt: str(r.triggered_at),
    createdAt: str(r.created_at),
  }));
}

export async function countActiveAlerts(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = ? AND active = 1",
    args: [userId],
  });
  return num(result.rows[0]?.cnt);
}

export async function createAlert(
  userId: string,
  alert: Omit<PriceAlert, "id" | "active" | "triggered" | "triggeredAt" | "createdAt">
): Promise<PriceAlert> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO price_alerts (id, user_id, ticker, name, condition, threshold, currency)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, alert.ticker, alert.name, alert.condition, alert.threshold, alert.currency],
  });
  return {
    ...alert,
    id,
    active: true,
    triggered: false,
    triggeredAt: "",
    createdAt: new Date().toISOString(),
  };
}

export async function deleteAlert(userId: string, alertId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM price_alerts WHERE id = ? AND user_id = ?",
    args: [alertId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function toggleAlert(userId: string, alertId: string, active: boolean): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE price_alerts SET active = ?, triggered = 0, triggered_at = '' WHERE id = ? AND user_id = ?",
    args: [active ? 1 : 0, alertId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function markAlertTriggered(alertId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE price_alerts SET triggered = 1, triggered_at = datetime('now'), active = 0 WHERE id = ?",
    args: [alertId],
  });
}

export async function listActiveAlertsForCron(): Promise<
  (PriceAlert & { userId: string; email: string; emailVerified: boolean; plan: string })[]
> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT pa.*, u.email, u.email_verified, u.plan
     FROM price_alerts pa
     JOIN users u ON u.id = pa.user_id
     WHERE pa.active = 1`
  );
  return result.rows.map((r) => ({
    id: str(r.id),
    userId: str(r.user_id),
    ticker: str(r.ticker),
    name: str(r.name),
    condition: alertCondition(r.condition),
    threshold: num(r.threshold),
    currency: str(r.currency),
    active: true,
    triggered: false,
    triggeredAt: "",
    createdAt: str(r.created_at),
    email: str(r.email),
    emailVerified: num(r.email_verified) === 1,
    plan: str(r.plan),
  }));
}
