import { ensureInitialized } from "@/lib/db/client";
import { num, str } from "@/lib/db/helpers";
import {
  classifySegment,
  isPowerUser,
  type EngagementSegment,
  type UserActivityRow,
} from "./segments";
import { aggregateToolsByBucket } from "./tool-taxonomy";
import { SURVEY_TEMPLATES, type SurveyTemplateId } from "./templates";

export interface NamedUserRef {
  userId: string;
  username: string;
  email: string;
  plan: string;
  segment: EngagementSegment;
  eventCountInWindow: number;
  lastEventAt: string | null;
  note?: string;
}

export interface EngagementSnapshot {
  generatedAt: string;
  periodDays: number;
  totals: {
    totalUsers: number;
    activeUsers7d: number;
    activeUsers30d: number;
    eventsInWindow: number;
  };
  segments: Record<EngagementSegment, { count: number; users: NamedUserRef[] }>;
  powerUsers: NamedUserRef[];
  toolUsage: ReturnType<typeof aggregateToolsByBucket>;
  topEvents: { event: string; count: number }[];
  mcpTools: { tool: string; count: number; users: number }[];
  satisfaction: {
    submitted: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    lowRaters: NamedUserRef[];
    recentComments: { username: string; rating: number; comment: string; submittedAt: string }[];
  };
  feedback: {
    open: number;
    answered: number;
    closed: number;
    recent: { username: string; type: string; subject: string; status: string; createdAt: string }[];
  };
  emailEligibleTargets: Record<
    SurveyTemplateId,
    { userIds: string[]; emails: string[]; rationaleHint: string }
  >;
}

function emptySegment(): { count: number; users: NamedUserRef[] } {
  return { count: 0, users: [] };
}

export async function buildEngagementSnapshot(periodDays: number): Promise<EngagementSnapshot> {
  const days = [7, 30, 90].includes(periodDays) ? periodDays : 30;
  const client = await ensureInitialized();
  const windowSql = `datetime('now', '-${days} days')`;

  const [
    totalUsersRes,
    active7Res,
    active30Res,
    eventsCountRes,
    eventsByTypeRes,
    activityRes,
    satisfactionStatsRes,
    satisfactionDistRes,
    lowRatersRes,
    commentsRes,
    feedbackCountsRes,
    feedbackRecentRes,
    mcpToolsRes,
  ] = await Promise.all([
    client.execute("SELECT COUNT(*) as cnt FROM users"),
    client.execute({
      sql: `SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events
            WHERE created_at >= datetime('now', '-7 days') AND user_id IS NOT NULL AND user_id != ''`,
    }),
    client.execute({
      sql: `SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events
            WHERE created_at >= datetime('now', '-30 days') AND user_id IS NOT NULL AND user_id != ''`,
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE created_at >= ${windowSql}`,
    }),
    client.execute({
      sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
            WHERE created_at >= ${windowSql}
            GROUP BY event ORDER BY cnt DESC LIMIT 80`,
    }),
    client.execute({
      sql: `SELECT u.id as user_id, u.username, u.email, u.plan, u.created_at,
                   MAX(ae.created_at) as last_event_at,
                   COUNT(CASE WHEN ae.created_at >= ${windowSql} THEN 1 END) as event_count,
                   COUNT(DISTINCT CASE WHEN ae.created_at >= ${windowSql} THEN ae.event END) as distinct_types
            FROM users u
            LEFT JOIN analytics_events ae ON ae.user_id = u.id
            GROUP BY u.id
            ORDER BY event_count DESC`,
    }),
    client.execute({
      sql: `SELECT COUNT(*) as submitted,
                   AVG(CASE WHEN status = 'submitted' THEN rating END) as avg_rating
            FROM satisfaction_surveys WHERE status = 'submitted'`,
    }),
    client.execute({
      sql: `SELECT rating, COUNT(*) as cnt FROM satisfaction_surveys
            WHERE status = 'submitted' GROUP BY rating`,
    }),
    client.execute({
      sql: `SELECT s.user_id, u.username, u.email, u.plan, s.rating, s.comment, s.submitted_at,
                   MAX(ae.created_at) as last_event_at,
                   COUNT(CASE WHEN ae.created_at >= ${windowSql} THEN 1 END) as event_count
            FROM satisfaction_surveys s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN analytics_events ae ON ae.user_id = s.user_id
            WHERE s.status = 'submitted' AND s.rating <= 3
            GROUP BY s.id
            ORDER BY s.submitted_at DESC
            LIMIT 25`,
    }),
    client.execute({
      sql: `SELECT u.username, s.rating, s.comment, s.submitted_at
            FROM satisfaction_surveys s
            JOIN users u ON u.id = s.user_id
            WHERE s.status = 'submitted' AND TRIM(COALESCE(s.comment, '')) != ''
            ORDER BY s.submitted_at DESC LIMIT 15`,
    }),
    client.execute({
      sql: `SELECT status, COUNT(*) as cnt FROM feedback GROUP BY status`,
    }),
    client.execute({
      sql: `SELECT u.username, f.type, f.subject, f.status, f.created_at
            FROM feedback f JOIN users u ON u.id = f.user_id
            ORDER BY f.created_at DESC LIMIT 20`,
    }),
    client.execute({
      sql: `SELECT tool_name as tool, COUNT(*) as cnt, COUNT(DISTINCT user_id) as users
            FROM mcp_analytics_events
            WHERE event_type = 'tool_call' AND created_at >= ${windowSql}
              AND tool_name IS NOT NULL AND tool_name != ''
            GROUP BY tool_name ORDER BY cnt DESC LIMIT 20`,
    }).catch(() => ({ rows: [] as import("@libsql/client").Row[] })),
  ]);

  const activityRows: UserActivityRow[] = activityRes.rows.map((r) => ({
    userId: str(r.user_id),
    username: str(r.username),
    email: str(r.email),
    plan: str(r.plan) || "free",
    lastEventAt: str(r.last_event_at) || null,
    eventCountInWindow: num(r.event_count),
    distinctEventTypes: num(r.distinct_types),
    createdAt: str(r.created_at),
  }));

  const segments: EngagementSnapshot["segments"] = {
    engaged: emptySegment(),
    warm: emptySegment(),
    dormant: emptySegment(),
    churned: emptySegment(),
    never_active: emptySegment(),
  };

  for (const row of activityRows) {
    const segment = classifySegment(row.lastEventAt);
    const ref: NamedUserRef = {
      userId: row.userId,
      username: row.username,
      email: row.email,
      plan: row.plan,
      segment,
      eventCountInWindow: row.eventCountInWindow,
      lastEventAt: row.lastEventAt,
    };
    segments[segment].count += 1;
    if (segments[segment].users.length < 15) {
      segments[segment].users.push(ref);
    }
  }

  // Prefer highest-activity users in engaged sample
  segments.engaged.users = activityRows
    .filter((r) => classifySegment(r.lastEventAt) === "engaged")
    .sort((a, b) => b.eventCountInWindow - a.eventCountInWindow)
    .slice(0, 15)
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      email: row.email,
      plan: row.plan,
      segment: "engaged" as const,
      eventCountInWindow: row.eventCountInWindow,
      lastEventAt: row.lastEventAt,
    }));

  const engagedPeers = activityRows.filter((r) => classifySegment(r.lastEventAt) === "engaged");
  const powerUsers = engagedPeers
    .filter((r) => isPowerUser(r, engagedPeers))
    .slice(0, 12)
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      email: row.email,
      plan: row.plan,
      segment: "engaged" as const,
      eventCountInWindow: row.eventCountInWindow,
      lastEventAt: row.lastEventAt,
      note: "power",
    }));

  const topEvents = eventsByTypeRes.rows.map((r) => ({
    event: str(r.event),
    count: num(r.cnt),
  }));

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of satisfactionDistRes.rows) {
    const rating = num(r.rating);
    if (rating >= 1 && rating <= 5) ratingDistribution[rating] = num(r.cnt);
  }

  const lowRaters: NamedUserRef[] = lowRatersRes.rows.map((r) => ({
    userId: str(r.user_id),
    username: str(r.username),
    email: str(r.email),
    plan: str(r.plan) || "free",
    segment: classifySegment(str(r.last_event_at) || null),
    eventCountInWindow: num(r.event_count),
    lastEventAt: str(r.last_event_at) || null,
    note: `${num(r.rating)}★`,
  }));

  const feedbackCounts = { open: 0, answered: 0, closed: 0 };
  for (const r of feedbackCountsRes.rows) {
    const status = str(r.status);
    if (status === "open" || status === "answered" || status === "closed") {
      feedbackCounts[status] = num(r.cnt);
    }
  }

  const emailEligible = await loadEmailEligibleUserIds(client);

  const emailEligibleTargets: EngagementSnapshot["emailEligibleTargets"] = {
    winback: {
      userIds: [],
      emails: [],
      rationaleHint: "Dormant/churned users with email notifications enabled",
    },
    missing_tool: {
      userIds: [],
      emails: [],
      rationaleHint: "Engaged users with narrow tool breadth (≤2 event types)",
    },
    nps: {
      userIds: [],
      emails: [],
      rationaleHint: "Engaged/warm users plus recent low CSAT raters",
    },
  };

  const byId = new Map(activityRows.map((r) => [r.userId, r]));

  const pushTarget = (template: SurveyTemplateId, userId: string) => {
    if (!emailEligible.has(userId)) return;
    const bucket = emailEligibleTargets[template];
    if (bucket.userIds.includes(userId)) return;
    if (bucket.userIds.length >= SURVEY_TEMPLATES[template].maxTargets) return;
    const row = byId.get(userId);
    if (!row?.email) return;
    bucket.userIds.push(userId);
    bucket.emails.push(row.email);
  };

  for (const row of activityRows) {
    const seg = classifySegment(row.lastEventAt);
    if (seg === "dormant" || seg === "churned") pushTarget("winback", row.userId);
    if (
      (seg === "engaged" || seg === "warm") &&
      row.eventCountInWindow >= 5 &&
      row.distinctEventTypes <= 2
    ) {
      pushTarget("missing_tool", row.userId);
    }
    if (seg === "engaged" || seg === "warm") pushTarget("nps", row.userId);
  }
  for (const r of lowRaters) pushTarget("nps", r.userId);

  return {
    generatedAt: new Date().toISOString(),
    periodDays: days,
    totals: {
      totalUsers: num(totalUsersRes.rows[0]?.cnt),
      activeUsers7d: num(active7Res.rows[0]?.cnt),
      activeUsers30d: num(active30Res.rows[0]?.cnt),
      eventsInWindow: num(eventsCountRes.rows[0]?.cnt),
    },
    segments,
    powerUsers,
    toolUsage: aggregateToolsByBucket(topEvents),
    topEvents: topEvents.slice(0, 25),
    mcpTools: mcpToolsRes.rows.map((r) => ({
      tool: str(r.tool),
      count: num(r.cnt),
      users: num(r.users),
    })),
    satisfaction: {
      submitted: num(satisfactionStatsRes.rows[0]?.submitted),
      averageRating: Math.round(num(satisfactionStatsRes.rows[0]?.avg_rating) * 100) / 100,
      ratingDistribution,
      lowRaters,
      recentComments: commentsRes.rows.map((r) => ({
        username: str(r.username),
        rating: num(r.rating),
        comment: str(r.comment).slice(0, 280),
        submittedAt: str(r.submitted_at),
      })),
    },
    feedback: {
      ...feedbackCounts,
      recent: feedbackRecentRes.rows.map((r) => ({
        username: str(r.username),
        type: str(r.type) || "feedback",
        subject: str(r.subject).slice(0, 120),
        status: str(r.status),
        createdAt: str(r.created_at),
      })),
    },
    emailEligibleTargets,
  };
}

async function loadEmailEligibleUserIds(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
): Promise<Set<string>> {
  const result = await client.execute({
    sql: `SELECT u.id
          FROM users u
          LEFT JOIN user_settings us ON us.user_id = u.id
          WHERE u.email IS NOT NULL AND TRIM(u.email) != ''
            AND COALESCE(us.email_notifications_enabled, 1) = 1`,
  });
  return new Set(result.rows.map((r) => str(r.id)));
}
