import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num, alertCondition, alertType, percentBasis, parseAlertChannels } from "./helpers";
import type { PriceAlert, NotificationChannel } from "@/lib/types";

function rowToAlert(r: Record<string, unknown>): PriceAlert {
  return {
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
    alertType: alertType(r.alert_type),
    percentBasis: percentBasis(r.percent_basis),
    percentValue: num(r.percent_value),
    isPortfolioWide: num(r.is_portfolio_wide) === 1,
    portfolioId: str(r.portfolio_id),
  };
}

export async function listAlerts(userId: string): Promise<PriceAlert[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowToAlert(r as unknown as Record<string, unknown>));
}

export async function listAlertedTickers(userId: string): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT DISTINCT ticker FROM price_alerts WHERE user_id = ? AND active = 1",
    args: [userId],
  });
  return result.rows.map((r) => str(r.ticker));
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
    sql: `INSERT INTO price_alerts (id, user_id, ticker, name, condition, threshold, currency,
          alert_type, percent_basis, percent_value, is_portfolio_wide, portfolio_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, alert.ticker, alert.name, alert.condition, alert.threshold, alert.currency,
      alert.alertType, alert.percentBasis, alert.percentValue,
      alert.isPortfolioWide ? 1 : 0, alert.portfolioId,
    ],
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

export async function updateLastNotified(alertId: string, ticker: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE price_alerts SET last_notified_ticker = ?, last_notified_at = datetime('now') WHERE id = ?",
    args: [ticker, alertId],
  });
}

export interface CronAlert extends PriceAlert {
  userId: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  alertChannels: NotificationChannel[];
  whatsappPhone: string;
  whatsappVerified: boolean;
  alertDeviceEnabled: boolean;
  lastNotifiedTicker: string;
  lastNotifiedAt: string;
}

export async function listActiveAlertsForCron(): Promise<CronAlert[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT pa.*, u.email, u.email_verified, u.plan,
            COALESCE(us.alert_channels, 'email') as alert_channels,
            COALESCE(us.whatsapp_phone, '') as whatsapp_phone,
            COALESCE(us.whatsapp_verified, 0) as whatsapp_verified,
            COALESCE(us.alert_device_enabled, 0) as alert_device_enabled
     FROM price_alerts pa
     JOIN users u ON u.id = pa.user_id
     LEFT JOIN user_settings us ON us.user_id = pa.user_id
     WHERE pa.active = 1`
  );
  return result.rows.map((r) => ({
    ...rowToAlert(r as unknown as Record<string, unknown>),
    userId: str(r.user_id),
    email: str(r.email),
    emailVerified: num(r.email_verified) === 1,
    plan: str(r.plan),
    alertChannels: parseAlertChannels(r.alert_channels),
    whatsappPhone: str(r.whatsapp_phone),
    whatsappVerified: num(r.whatsapp_verified) === 1,
    alertDeviceEnabled: num(r.alert_device_enabled) === 1,
    lastNotifiedTicker: str(r.last_notified_ticker),
    lastNotifiedAt: str(r.last_notified_at),
  }));
}

export interface HoldingForAlert {
  ticker: string;
  name: string;
  purchasePrice: number;
  shares: number;
  displayCurrency: string;
  exchange: string;
}

export async function getUserHoldingsForAlerts(
  userId: string,
  portfolioId?: string
): Promise<HoldingForAlert[]> {
  const client = await ensureInitialized();
  const sql = portfolioId
    ? "SELECT ticker, name, purchase_price, shares, display_currency, exchange FROM holdings WHERE user_id = ? AND portfolio_id = ?"
    : "SELECT ticker, name, purchase_price, shares, display_currency, exchange FROM holdings WHERE user_id = ?";
  const args = portfolioId ? [userId, portfolioId] : [userId];
  const result = await client.execute({ sql, args });
  return result.rows.map((r) => ({
    ticker: str(r.ticker),
    name: str(r.name),
    purchasePrice: num(r.purchase_price),
    shares: num(r.shares),
    displayCurrency: str(r.display_currency),
    exchange: str(r.exchange),
  }));
}
