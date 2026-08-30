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
): Promise<{ alert: PriceAlert; alreadyExists: boolean }> {
  const client = await ensureInitialized();
  // Soft-dedupe keyed by alert type (threshold vs percent have different uniqueness)
  const existing =
    alert.alertType === "percent_change"
      ? await client.execute({
          sql: `SELECT * FROM price_alerts
                WHERE user_id = ? AND ticker = ? AND alert_type = 'percent_change'
                  AND percent_basis = ? AND percent_value = ?
                  AND is_portfolio_wide = ? AND portfolio_id = ? AND active = 1
                LIMIT 1`,
          args: [
            userId,
            alert.ticker,
            alert.percentBasis,
            alert.percentValue,
            alert.isPortfolioWide ? 1 : 0,
            alert.portfolioId,
          ],
        })
      : await client.execute({
          sql: `SELECT * FROM price_alerts
                WHERE user_id = ? AND ticker = ? AND condition = ? AND threshold = ?
                  AND currency = ? AND alert_type = 'threshold' AND active = 1
                LIMIT 1`,
          args: [userId, alert.ticker, alert.condition, alert.threshold, alert.currency],
        });
  if (existing.rows.length > 0) {
    return {
      alert: rowToAlert(existing.rows[0] as unknown as Record<string, unknown>),
      alreadyExists: true,
    };
  }
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
    alert: {
      ...alert,
      id,
      active: true,
      triggered: false,
      triggeredAt: "",
      createdAt: new Date().toISOString(),
    },
    alreadyExists: false,
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

/** Atomically claim a one-shot alert so overlapping cron runs cannot both dispatch. */
export async function claimAlertForOneShotDispatch(alertId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE price_alerts
          SET triggered = 1, triggered_at = datetime('now'), active = 0
          WHERE id = ? AND active = 1 AND triggered = 0`,
    args: [alertId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/** True if this alert already delivered email in the last 24 hours (optionally for one ticker). */
export async function hasRecentFiredEmailDispatch(alertId: string, ticker?: string): Promise<boolean> {
  if (!alertId) return false;
  const client = await ensureInitialized();
  const tickerFilter = ticker ? " AND ticker = ?" : "";
  const args: string[] = [alertId];
  if (ticker) args.push(ticker);
  const result = await client.execute({
    sql: `SELECT 1 AS hit FROM alert_dispatch_log
          WHERE alert_id = ?
            AND status = 'fired'
            AND (',' || channels_sent || ',') LIKE '%,email,%'
            AND created_at >= datetime('now', '-1 day')${tickerFilter}
          LIMIT 1`,
    args,
  });
  return result.rows.length > 0;
}

/**
 * Atomically record a portfolio-wide notify for `ticker` on the current UTC day.
 * Returns false if that ticker was already recorded today (overlapping cron).
 */
export async function claimPortfolioWideTickerNotify(alertId: string, ticker: string): Promise<boolean> {
  const key = ticker.trim().toUpperCase();
  if (!alertId || !key) return false;
  const client = await ensureInitialized();
  const like = `%,${key},%`;
  const result = await client.execute({
    sql: `UPDATE price_alerts
          SET last_notified_ticker = CASE
                WHEN last_notified_at != ''
                     AND date(last_notified_at) = date('now')
                     AND last_notified_ticker != ''
                  THEN last_notified_ticker || ',' || ?
                ELSE ?
              END,
              last_notified_at = datetime('now')
          WHERE id = ?
            AND NOT (
              last_notified_at != ''
              AND date(last_notified_at) = date('now')
              AND (',' || last_notified_ticker || ',') LIKE ?
            )`,
    args: [key, key, alertId, like],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function updateLastNotified(alertId: string, ticker: string): Promise<void> {
  await claimPortfolioWideTickerNotify(alertId, ticker);
}

export interface CronAlert extends PriceAlert {
  userId: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  alertChannels: NotificationChannel[];
  telegramChatId: string;
  alertDeviceEnabled: boolean;
  lastNotifiedTicker: string;
  lastNotifiedAt: string;
  language: string;
}

export async function listActiveAlertsForCron(): Promise<CronAlert[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT pa.*, u.email, u.email_verified, u.plan,
            COALESCE(us.alert_channels, 'email') as alert_channels,
            COALESCE(us.telegram_chat_id, '') as telegram_chat_id,
            COALESCE(us.alert_device_enabled, 0) as alert_device_enabled,
            COALESCE(us.language, 'en') as language
     FROM price_alerts pa
     JOIN users u ON u.id = pa.user_id
     LEFT JOIN user_settings us ON us.user_id = pa.user_id
     WHERE pa.active = 1 AND u.deleted_at = ''`
  );
  return result.rows.map((r) => ({
    ...rowToAlert(r as unknown as Record<string, unknown>),
    userId: str(r.user_id),
    email: str(r.email),
    emailVerified: num(r.email_verified) === 1,
    plan: str(r.plan),
    alertChannels: parseAlertChannels(r.alert_channels),
    telegramChatId: str(r.telegram_chat_id),
    alertDeviceEnabled: num(r.alert_device_enabled) === 1,
    lastNotifiedTicker: str(r.last_notified_ticker),
    lastNotifiedAt: str(r.last_notified_at),
    language: str(r.language) || "en",
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

export type AlertDispatchStatus =
  | "fired"
  | "dispatch_failed"
  | "skipped_config"
  | "quote_invalid"
  | "fx_unavailable";

export interface InsertAlertDispatchLogParams {
  userId: string;
  alertId: string;
  ticker: string;
  alertType: string;
  status: AlertDispatchStatus;
  channelsRequested: string[];
  channelsSent: string[];
  channelsFailed?: string[];
  channelsSkipped?: { channel: string; reason: string }[];
  details?: Record<string, unknown>;
}

export async function insertAlertDispatchLog(params: InsertAlertDispatchLogParams): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: `INSERT INTO alert_dispatch_log
              (id, user_id, alert_id, ticker, alert_type, status,
               channels_requested, channels_sent, channels_failed, channels_skipped, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        params.userId,
        params.alertId,
        params.ticker,
        params.alertType,
        params.status,
        params.channelsRequested.join(","),
        params.channelsSent.join(","),
        (params.channelsFailed ?? []).join(","),
        JSON.stringify(params.channelsSkipped ?? []),
        JSON.stringify(params.details ?? {}),
      ],
    });
  } catch (err) {
    console.error(
      "[alert-dispatch-log] insert failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export interface AlertDispatchLogRow {
  id: string;
  userId: string;
  alertId: string;
  ticker: string;
  alertType: string;
  status: string;
  channelsRequested: string;
  channelsSent: string;
  channelsFailed: string;
  channelsSkipped: string;
  details: string;
  createdAt: string;
}

export interface AlertDispatchSummary {
  activeAlerts: number;
  logs24h: number;
  fired24h: number;
  failed24h: number;
  skipped24h: number;
  byChannelSent24h: Record<string, number>;
  byStatus7d: Record<string, number>;
}

export async function getAlertDispatchSummary(): Promise<AlertDispatchSummary> {
  const client = await ensureInitialized();
  const [active, logs24, byStatus, channelRows] = await Promise.all([
    client.execute("SELECT COUNT(*) as cnt FROM price_alerts WHERE active = 1"),
    client.execute(
      `SELECT status, COUNT(*) as cnt FROM alert_dispatch_log
       WHERE created_at >= datetime('now', '-1 day') GROUP BY status`,
    ),
    client.execute(
      `SELECT status, COUNT(*) as cnt FROM alert_dispatch_log
       WHERE created_at >= datetime('now', '-7 day') GROUP BY status`,
    ),
    client.execute(
      `SELECT channels_sent FROM alert_dispatch_log
       WHERE created_at >= datetime('now', '-1 day') AND channels_sent != ''`,
    ),
  ]);

  let fired24h = 0;
  let failed24h = 0;
  let skipped24h = 0;
  let logs24h = 0;
  for (const row of logs24.rows) {
    const status = str(row.status);
    const cnt = num(row.cnt);
    logs24h += cnt;
    if (status === "fired") fired24h += cnt;
    else if (status === "dispatch_failed") failed24h += cnt;
    else skipped24h += cnt;
  }

  const byStatus7d: Record<string, number> = {};
  for (const row of byStatus.rows) {
    byStatus7d[str(row.status)] = num(row.cnt);
  }

  const byChannelSent24h: Record<string, number> = {};
  for (const row of channelRows.rows) {
    for (const ch of str(row.channels_sent).split(",").filter(Boolean)) {
      byChannelSent24h[ch] = (byChannelSent24h[ch] || 0) + 1;
    }
  }

  return {
    activeAlerts: num(active.rows[0]?.cnt),
    logs24h,
    fired24h,
    failed24h,
    skipped24h,
    byChannelSent24h,
    byStatus7d,
  };
}

export async function listAlertDispatchLogs(opts: {
  limit?: number;
  offset?: number;
  userId?: string;
  status?: string;
  channel?: string;
} = {}): Promise<{ logs: AlertDispatchLogRow[]; total: number }> {
  const client = await ensureInitialized();
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts.userId) {
    conditions.push("user_id = ?");
    args.push(opts.userId);
  }
  if (opts.status) {
    conditions.push("status = ?");
    args.push(opts.status);
  }
  if (opts.channel) {
    conditions.push("(',' || channels_sent || ',' LIKE ? OR ',' || channels_requested || ',' LIKE ?)");
    args.push(`%,${opts.channel},%`, `%,${opts.channel},%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM alert_dispatch_log ${where}`,
    args,
  });
  const listArgs = [...args, limit, offset];
  const listRes = await client.execute({
    sql: `SELECT * FROM alert_dispatch_log ${where}
          ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: listArgs,
  });

  return {
    total: num(countRes.rows[0]?.cnt),
    logs: listRes.rows.map((r) => ({
      id: str(r.id),
      userId: str(r.user_id),
      alertId: str(r.alert_id),
      ticker: str(r.ticker),
      alertType: str(r.alert_type),
      status: str(r.status),
      channelsRequested: str(r.channels_requested),
      channelsSent: str(r.channels_sent),
      channelsFailed: str(r.channels_failed),
      channelsSkipped: str(r.channels_skipped),
      details: str(r.details),
      createdAt: str(r.created_at),
    })),
  };
}
