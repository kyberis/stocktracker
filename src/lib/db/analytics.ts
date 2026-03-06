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

  const [
    usersResult, active7d, active30d, totalEvents, eventsByType, topStocks, dailyActivity, signupsByDay,
    landingPageViews, landingCtaClicks, landingEventsByType, landingCtaBreakdown, landingDailyViews,
    funnelSignups, funnelUpsellShown, funnelUpsellClicked, funnelCheckoutStarted, funnelCheckoutCompleted,
  ] = await Promise.all([
      client.execute("SELECT COUNT(*) as cnt FROM users"),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-7 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-30 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM analytics_events WHERE created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.ticker') as ticker, COUNT(*) as cnt
              FROM analytics_events
              WHERE event = 'stock_view' AND created_at >= datetime('now', ?)
              GROUP BY ticker ORDER BY cnt DESC LIMIT 10`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day,
                     COUNT(DISTINCT user_id) as users,
                     COUNT(*) as events
              FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM users
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM landing_events WHERE event = 'landing_page_view' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM landing_events WHERE event = 'landing_cta_click' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM landing_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.cta') as cta, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_cta_click' AND created_at >= datetime('now', ?)
              GROUP BY cta ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_page_view' AND created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE event = 'signup' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE event = 'upgrade_compare_shown' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE event = 'upgrade_compare_clicked' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE event = 'billing_checkout_started' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE event = 'billing_checkout_completed' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
    ]);

  return {
    totalUsers: num(usersResult.rows[0]?.cnt),
    activeUsers7d: num(active7d.rows[0]?.cnt),
    activeUsers30d: num(active30d.rows[0]?.cnt),
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
      totalPageViews: num(landingPageViews.rows[0]?.cnt),
      totalCtaClicks: num(landingCtaClicks.rows[0]?.cnt),
      eventsByType: landingEventsByType.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
      ctaBreakdown: landingCtaBreakdown.rows.map((r) => ({ cta: str(r.cta), count: num(r.cnt) })),
      dailyViews: landingDailyViews.rows.map((r) => ({ date: str(r.day), views: num(r.cnt) })),
    },
    funnel: [
      { stage: "Signups", count: num(funnelSignups.rows[0]?.cnt) },
      { stage: "Upsell Shown", count: num(funnelUpsellShown.rows[0]?.cnt) },
      { stage: "Upsell Clicked", count: num(funnelUpsellClicked.rows[0]?.cnt) },
      { stage: "Checkout Started", count: num(funnelCheckoutStarted.rows[0]?.cnt) },
      { stage: "Checkout Completed", count: num(funnelCheckoutCompleted.rows[0]?.cnt) },
    ],
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
