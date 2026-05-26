import { randomUUID } from "crypto";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import { incrementInteractionCount } from "./satisfaction";

const SATISFACTION_QUALIFYING_EVENTS = new Set([
  "holding_add",
  "holding_delete",
  "portfolio_import",
  "alert_created",
  "portfolio_review_completed",
  "portfolio_score_completed",
  "csv_exported",
  "snaptrade_fetch",
  "snaptrade_auto_sync",
  "tax_report_generated",
]);

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
  telegramSent: number;
  pushSent: number;
  deviceSent: number;
  total: number;
}

export interface AttributionSourceStats {
  source: string;
  signups: number;
  paidConversions: number;
  conversionRate: number;
}

export interface AttributionMediumStats {
  medium: string;
  signups: number;
  paidConversions: number;
  conversionRate: number;
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
  attributionBySource: AttributionSourceStats[];
  attributionByMedium: AttributionMediumStats[];
  conversionParity: {
    overallMatchRate: number;
    byEvent: {
      event: "signup_completed" | "checkout_started" | "checkout_completed";
      internalCount: number;
      adDispatchedCount: number;
      matchRate: number;
    }[];
  };
}

export interface ProdOpsLatestAnalyticsInteraction {
  userId: string;
  username: string;
  event: string;
  metadataSummary: string;
  createdAt: string;
}

function summarizeAnalyticsMetadata(raw: unknown): string {
  const json = str(raw);
  if (!json) return "";
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 3)
      .map(([key, value]) => `${key}=${String(value)}`);
    return entries.join(", ").slice(0, 160);
  } catch {
    return "";
  }
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

    if (SATISFACTION_QUALIFYING_EVENTS.has(event)) {
      incrementInteractionCount(userId).catch(() => {});
    }
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

export async function getLatestAnalyticsInteraction(): Promise<ProdOpsLatestAnalyticsInteraction | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT ae.user_id, ae.event, ae.metadata, ae.created_at, u.username
          FROM analytics_events ae
          LEFT JOIN users u ON u.id = ae.user_id
          ORDER BY ae.created_at DESC
          LIMIT 1`,
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    userId: str(row.user_id),
    username: str(row.username),
    event: str(row.event),
    metadataSummary: summarizeAnalyticsMetadata(row.metadata),
    createdAt: str(row.created_at),
  };
}

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const client = await ensureInitialized();

  const daysArg = `-${days} days`;

  const [
    usersResult, activeUsers, totalEvents, eventsByType, topStocks, dailyActivity, signupsByDay,
    landingCounts, landingEventsByType, landingCtaBreakdown, landingDailyViews,
    funnelResult, attributionBySource, attributionByMedium, internalConversions, adDispatchedConversions,
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
              WHERE event IN ('signup', 'upgrade_compare_shown', 'upgrade_compare_clicked', 'billing_checkout_started', 'billing_checkout_completed', 'onboarding_trial_shown', 'onboarding_trial_activated', 'onboarding_trial_skipped')
                AND created_at >= datetime('now', ?)
              GROUP BY event`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT
                CASE
                  WHEN u.utm_source IS NULL OR TRIM(u.utm_source) = '' THEN 'unknown'
                  ELSE LOWER(TRIM(u.utm_source))
                END AS source,
                COUNT(*) AS signups,
                COUNT(DISTINCT CASE WHEN ae.user_id IS NOT NULL THEN u.id END) AS paid_conversions
              FROM users u
              LEFT JOIN analytics_events ae
                ON ae.user_id = u.id
               AND ae.event = 'billing_checkout_completed'
               AND ae.created_at >= datetime('now', ?)
              WHERE u.created_at >= datetime('now', ?)
              GROUP BY source
              ORDER BY signups DESC, paid_conversions DESC`,
        args: [daysArg, daysArg],
      }),
      client.execute({
        sql: `SELECT
                CASE
                  WHEN u.utm_medium IS NULL OR TRIM(u.utm_medium) = '' THEN 'unknown'
                  ELSE LOWER(TRIM(u.utm_medium))
                END AS medium,
                COUNT(*) AS signups,
                COUNT(DISTINCT CASE WHEN ae.user_id IS NOT NULL THEN u.id END) AS paid_conversions
              FROM users u
              LEFT JOIN analytics_events ae
                ON ae.user_id = u.id
               AND ae.event = 'billing_checkout_completed'
               AND ae.created_at >= datetime('now', ?)
              WHERE u.created_at >= datetime('now', ?)
              GROUP BY medium
              ORDER BY signups DESC, paid_conversions DESC`,
        args: [daysArg, daysArg],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) AS cnt
              FROM analytics_events
              WHERE event IN ('signup_completed', 'checkout_started', 'checkout_completed')
                AND created_at >= datetime('now', ?)
              GROUP BY event`,
        args: [daysArg],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.event') AS event, COUNT(*) AS cnt
              FROM analytics_events
              WHERE event = 'ad_conversion_dispatched'
                AND created_at >= datetime('now', ?)
              GROUP BY json_extract(metadata, '$.event')`,
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
            SUM(CASE WHEN ae.event = 'alert_telegram_sent' THEN 1 ELSE 0 END) as telegram_sent,
            SUM(CASE WHEN ae.event = 'alert_push_sent' THEN 1 ELSE 0 END) as push_sent,
            SUM(CASE WHEN ae.event = 'alert_device_sent' THEN 1 ELSE 0 END) as device_sent,
            COUNT(*) as total
          FROM analytics_events ae
          JOIN users u ON u.id = ae.user_id
          WHERE ae.event IN ('alert_email_sent', 'alert_telegram_sent', 'alert_push_sent', 'alert_device_sent')
            AND ae.created_at >= datetime('now', ?)
          GROUP BY ae.user_id
          ORDER BY total DESC`,
    args: [`-${days} days`],
  });

  const funnelMap = new Map<string, number>();
  for (const r of funnelResult.rows) {
    funnelMap.set(str(r.event), num(r.cnt));
  }
  const internalMap = new Map<string, number>();
  for (const r of internalConversions.rows) {
    internalMap.set(str(r.event), num(r.cnt));
  }
  const dispatchedMap = new Map<string, number>();
  for (const r of adDispatchedConversions.rows) {
    dispatchedMap.set(str(r.event), num(r.cnt));
  }
  const conversionEvents = ["signup_completed", "checkout_started", "checkout_completed"] as const;
  const parityByEvent = conversionEvents.map((event) => {
    const internalCount = internalMap.get(event) ?? 0;
    const adDispatchedCount = dispatchedMap.get(event) ?? 0;
    const matchRate = internalCount > 0
      ? Number(((adDispatchedCount / internalCount) * 100).toFixed(1))
      : 0;
    return { event, internalCount, adDispatchedCount, matchRate };
  });
  const totalInternal = parityByEvent.reduce((sum, row) => sum + row.internalCount, 0);
  const totalDispatched = parityByEvent.reduce((sum, row) => sum + row.adDispatchedCount, 0);
  const overallMatchRate = totalInternal > 0
    ? Number(((totalDispatched / totalInternal) * 100).toFixed(1))
    : 0;

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
      { stage: "Trial Offer Shown", count: funnelMap.get("onboarding_trial_shown") ?? 0 },
      { stage: "Trial Activated", count: funnelMap.get("onboarding_trial_activated") ?? 0 },
      { stage: "Trial Skipped", count: funnelMap.get("onboarding_trial_skipped") ?? 0 },
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
      telegramSent: num(r.telegram_sent),
      pushSent: num(r.push_sent),
      deviceSent: num(r.device_sent),
      total: num(r.total),
    })),
    attributionBySource: attributionBySource.rows.map((r) => {
      const signups = num(r.signups);
      const paidConversions = num(r.paid_conversions);
      return {
        source: str(r.source),
        signups,
        paidConversions,
        conversionRate: signups > 0 ? Number(((paidConversions / signups) * 100).toFixed(1)) : 0,
      };
    }),
    attributionByMedium: attributionByMedium.rows.map((r) => {
      const signups = num(r.signups);
      const paidConversions = num(r.paid_conversions);
      return {
        medium: str(r.medium),
        signups,
        paidConversions,
        conversionRate: signups > 0 ? Number(((paidConversions / signups) * 100).toFixed(1)) : 0,
      };
    }),
    conversionParity: {
      overallMatchRate,
      byEvent: parityByEvent,
    },
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
