import { randomUUID } from "crypto";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export interface LandingAnalytics {
  totalPageViews: number;
  totalCtaClicks: number;
  eventsByType: { event: string; count: number }[];
  ctaBreakdown: { cta: string; count: number }[];
  dailyViews: { date: string; views: number }[];
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface NotificationUserStats {
  userId: string;
  username: string;
  email: string;
  plan: string;
  emailSent: number;
  whatsappSent: number;
  pushSent: number;
  deviceSent: number;
  total: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalEvents: number;
  eventsByType: { event: string; count: number }[];
  topStocks: { ticker: string; views: number }[];
  dailyActivity: { date: string; users: number; events: number }[];
  signupsByDay: { date: string; count: number }[];
  landing: LandingAnalytics;
  funnel: FunnelStage[];
  notificationStats: NotificationUserStats[];
}

export async function trackEvent(
  userId: string,
  event: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: "INSERT INTO analytics_events (id, user_id, event, metadata) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), userId, event, metadata ? JSON.stringify(metadata) : null],
    });
  } catch (err) {
    console.error("Failed to track event:", err instanceof Error ? err.message : err);
  }
}

export async function trackLandingEvent(
  event: string,
  metadata?: Record<string, string>,
  referrer?: string
): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: "INSERT INTO landing_events (id, event, metadata, referrer) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), event, metadata ? JSON.stringify(metadata) : null, referrer || null],
    });
  } catch (err) {
    console.error("Failed to track landing event:", err instanceof Error ? err.message : err);
  }
}

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const client = await ensureInitialized();

  const daysArg = `-${days} days`;

  const [
    usersResult, activeUsers, totalEvents, eventsByType, topStocks, dailyActivity, signupsByDay,
    landingCounts, landingEventsByType, landingCtaBreakdown, landingDailyViews,
    funnelResult,
  ] = await Promise.all([
      client.execute("SELECT COUNT(*) as cnt FROM users"),
      client.execute({
        sql: `SELECT
                COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-7 days') THEN user_id END) as active_7d,
                COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-30 days') THEN user_id END) as active_30d
              FROM analytics_events
              WHERE created_at >= datetime('now', '-30 days')`,
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM analytics_events WHERE created_at >= datetime('now', ?)",
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.ticker') as ticker, COUNT(*) as cnt
              FROM analytics_events
              WHERE event = 'stock_view' AND created_at >= datetime('now', ?)
              GROUP BY ticker ORDER BY cnt DESC LIMIT 10`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day,
                     COUNT(DISTINCT user_id) as users,
                     COUNT(*) as events
              FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM users
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT
                SUM(CASE WHEN event = 'landing_page_view' THEN 1 ELSE 0 END) as page_views,
                SUM(CASE WHEN event = 'landing_cta_click' THEN 1 ELSE 0 END) as cta_clicks
              FROM landing_events
              WHERE created_at >= datetime('now', ?)`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM landing_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.cta') as cta, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_cta_click' AND created_at >= datetime('now', ?)
              GROUP BY cta ORDER BY cnt DESC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_page_view' AND created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT event, COUNT(DISTINCT user_id) as cnt
              FROM analytics_events
              WHERE event IN ('signup', 'upgrade_compare_shown', 'upgrade_compare_clicked', 'billing_checkout_started', 'billing_checkout_completed')
                AND created_at >= datetime('now', ?)
              GROUP BY event`,
        args: [daysArg],
      }),
    ]);

  const notifResult = await client.execute({
    sql: `SELECT
            ae.user_id,
            u.username,
            u.email,
            u.plan,
            SUM(CASE WHEN ae.event = 'alert_email_sent' THEN 1 ELSE 0 END) as email_sent,
            SUM(CASE WHEN ae.event = 'alert_whatsapp_sent' THEN 1 ELSE 0 END) as whatsapp_sent,
            SUM(CASE WHEN ae.event = 'alert_push_sent' THEN 1 ELSE 0 END) as push_sent,
            SUM(CASE WHEN ae.event = 'alert_device_sent' THEN 1 ELSE 0 END) as device_sent,
            COUNT(*) as total
          FROM analytics_events ae
          JOIN users u ON u.id = ae.user_id
          WHERE ae.event IN ('alert_email_sent', 'alert_whatsapp_sent', 'alert_push_sent', 'alert_device_sent')
            AND ae.created_at >= datetime('now', ?)
          GROUP BY ae.user_id
          ORDER BY total DESC`,
    args: [`-${days} days`],
  });

  const funnelMap = new Map<string, number>();
  for (const r of funnelResult.rows) {
    funnelMap.set(str(r.event), num(r.cnt));
  }

  return {
    totalUsers: num(usersResult.rows[0]?.cnt),
    activeUsers7d: num(activeUsers.rows[0]?.active_7d),
    activeUsers30d: num(activeUsers.rows[0]?.active_30d),
    totalEvents: num(totalEvents.rows[0]?.cnt),
    eventsByType: eventsByType.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
    topStocks: topStocks.rows.map((r) => ({ ticker: str(r.ticker), views: num(r.cnt) })),
    dailyActivity: dailyActivity.rows.map((r) => ({
      date: str(r.day),
      users: num(r.users),
      events: num(r.events),
    })),
    signupsByDay: signupsByDay.rows.map((r) => ({ date: str(r.day), count: num(r.cnt) })),
    landing: {
      totalPageViews: num(landingCounts.rows[0]?.page_views),
      totalCtaClicks: num(landingCounts.rows[0]?.cta_clicks),
      eventsByType: landingEventsByType.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
      ctaBreakdown: landingCtaBreakdown.rows.map((r) => ({ cta: str(r.cta), count: num(r.cnt) })),
      dailyViews: landingDailyViews.rows.map((r) => ({ date: str(r.day), views: num(r.cnt) })),
    },
    funnel: [
      { stage: "Signups", count: funnelMap.get("signup") ?? 0 },
      { stage: "Upsell Shown", count: funnelMap.get("upgrade_compare_shown") ?? 0 },
      { stage: "Upsell Clicked", count: funnelMap.get("upgrade_compare_clicked") ?? 0 },
      { stage: "Checkout Started", count: funnelMap.get("billing_checkout_started") ?? 0 },
      { stage: "Checkout Completed", count: funnelMap.get("billing_checkout_completed") ?? 0 },
    ],
    notificationStats: notifResult.rows.map((r) => ({
      userId: str(r.user_id),
      username: str(r.username),
      email: str(r.email),
      plan: str(r.plan),
      emailSent: num(r.email_sent),
      whatsappSent: num(r.whatsapp_sent),
      pushSent: num(r.push_sent),
      deviceSent: num(r.device_sent),
      total: num(r.total),
    })),
  };
}

/**
 * Delete analytics_events and landing_events older than the configured retention period.
 * Returns the total number of rows deleted.
 */
export async function purgeOldAnalyticsEvents(): Promise<number> {
  const client = await ensureInitialized();
  const days = PLATFORM_LIMITS.ANALYTICS_RETENTION_DAYS;

  const [a, b] = await Promise.all([
    client.execute({
      sql: "DELETE FROM analytics_events WHERE created_at < datetime('now', ?)",
      args: [`-${days} days`],
    }),
    client.execute({
      sql: "DELETE FROM landing_events WHERE created_at < datetime('now', ?)",
      args: [`-${days} days`],
    }),
  ]);

  return (a.rowsAffected ?? 0) + (b.rowsAffected ?? 0);
}
