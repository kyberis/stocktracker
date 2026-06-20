import { randomUUID } from "crypto";

import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

export type McpAnalyticsEventType =
  | "profile_view"
  | "pat_created"
  | "pat_revoked"
  | "client_init"
  | "tool_call";

export interface McpAnalyticsEventInput {
  userId: string;
  eventType: McpAnalyticsEventType;
  toolName?: string | null;
  authType?: "pat" | "oauth" | null;
  tokenId?: string | null;
  metadata?: Record<string, string>;
}

export interface McpFunnelStats {
  profileViews: number;
  tokensCreated: number;
  usersWithTokens: number;
  clientsConnected: number;
  activeUsers: number;
  totalToolCalls: number;
}

export interface McpDailyToolCalls {
  date: string;
  calls: number;
  users: number;
}

export interface McpToolBreakdown {
  tool: string;
  count: number;
}

export interface McpRecurrenceBucket {
  bucket: string;
  users: number;
}

export interface McpUserAnalyticsRow {
  userId: string;
  username: string;
  email: string;
  plan: string;
  tokensCreated: number;
  firstTokenAt: string | null;
  clientConnectedAt: string | null;
  toolCallsPeriod: number;
  toolCallsAllTime: number;
  activeDaysPeriod: number;
  lastToolCallAt: string | null;
  authTypes: string;
}

export interface McpAnalyticsSummary {
  periodDays: number;
  funnel: McpFunnelStats;
  dailyToolCalls: McpDailyToolCalls[];
  toolBreakdown: McpToolBreakdown[];
  recurrence: McpRecurrenceBucket[];
  users: McpUserAnalyticsRow[];
}

/** Fire-and-forget safe: callers should void the promise. */
export async function trackMcpAnalyticsEvent(input: McpAnalyticsEventInput): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: `INSERT INTO mcp_analytics_events
            (id, user_id, event_type, tool_name, auth_type, token_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        input.userId,
        input.eventType,
        input.toolName ?? null,
        input.authType ?? null,
        input.tokenId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    });
  } catch (e) {
    console.error("[mcp-analytics] track failed:", e);
  }
}

function daysSql(days: number): string {
  return `-${Math.min(Math.max(days, 1), 365)} days`;
}

export async function getMcpAnalyticsSummary(days = 30): Promise<McpAnalyticsSummary> {
  const client = await ensureInitialized();
  const since = daysSql(days);

  const [
    funnelRes,
    dailyRes,
    toolsRes,
    recurrenceRes,
    usersRes,
  ] = await Promise.all([
    client.execute({
      sql: `
        SELECT
          (SELECT COUNT(DISTINCT user_id) FROM mcp_analytics_events
           WHERE event_type = 'profile_view' AND created_at >= datetime('now', ?)) AS profile_views,
          (SELECT COUNT(*) FROM mcp_analytics_events
           WHERE event_type = 'pat_created' AND created_at >= datetime('now', ?)) AS tokens_created,
          (SELECT COUNT(DISTINCT user_id) FROM mcp_analytics_events
           WHERE event_type = 'pat_created' AND created_at >= datetime('now', ?)) AS users_with_tokens,
          (SELECT COUNT(DISTINCT user_id) FROM mcp_analytics_events
           WHERE event_type = 'client_init' AND created_at >= datetime('now', ?)) AS clients_connected,
          (SELECT COUNT(DISTINCT user_id) FROM mcp_analytics_events
           WHERE event_type = 'tool_call' AND created_at >= datetime('now', ?)) AS active_users,
          (SELECT COUNT(*) FROM mcp_analytics_events
           WHERE event_type = 'tool_call' AND created_at >= datetime('now', ?)) AS total_tool_calls
      `,
      args: [since, since, since, since, since, since],
    }),
    client.execute({
      sql: `
        SELECT date(created_at) AS d,
               COUNT(*) AS calls,
               COUNT(DISTINCT user_id) AS users
        FROM mcp_analytics_events
        WHERE event_type = 'tool_call' AND created_at >= datetime('now', ?)
        GROUP BY date(created_at)
        ORDER BY d ASC
      `,
      args: [since],
    }),
    client.execute({
      sql: `
        SELECT COALESCE(tool_name, 'unknown') AS tool, COUNT(*) AS cnt
        FROM mcp_analytics_events
        WHERE event_type = 'tool_call' AND created_at >= datetime('now', ?)
        GROUP BY tool_name
        ORDER BY cnt DESC
        LIMIT 20
      `,
      args: [since],
    }),
    client.execute({
      sql: `
        WITH user_days AS (
          SELECT user_id, COUNT(DISTINCT date(created_at)) AS active_days
          FROM mcp_analytics_events
          WHERE event_type = 'tool_call' AND created_at >= datetime('now', ?)
          GROUP BY user_id
        )
        SELECT
          CASE
            WHEN active_days = 1 THEN '1 day'
            WHEN active_days BETWEEN 2 AND 3 THEN '2–3 days'
            WHEN active_days BETWEEN 4 AND 7 THEN '4–7 days'
            ELSE '8+ days'
          END AS bucket,
          COUNT(*) AS users
        FROM user_days
        GROUP BY bucket
        ORDER BY
          CASE bucket
            WHEN '1 day' THEN 1
            WHEN '2–3 days' THEN 2
            WHEN '4–7 days' THEN 3
            ELSE 4
          END
      `,
      args: [since],
    }),
    client.execute({
      sql: `
        WITH agg AS (
          SELECT
            e.user_id,
            SUM(CASE WHEN e.event_type = 'pat_created' THEN 1 ELSE 0 END) AS tokens_created,
            MIN(CASE WHEN e.event_type = 'pat_created' THEN e.created_at END) AS first_token_at,
            MIN(CASE WHEN e.event_type = 'client_init' THEN e.created_at END) AS client_connected_at,
            SUM(CASE WHEN e.event_type = 'tool_call' AND e.created_at >= datetime('now', ?) THEN 1 ELSE 0 END) AS tool_calls_period,
            SUM(CASE WHEN e.event_type = 'tool_call' THEN 1 ELSE 0 END) AS tool_calls_all_time,
            COUNT(DISTINCT CASE
              WHEN e.event_type = 'tool_call' AND e.created_at >= datetime('now', ?)
              THEN date(e.created_at)
            END) AS active_days_period,
            MAX(CASE WHEN e.event_type = 'tool_call' THEN e.created_at END) AS last_tool_call_at,
            GROUP_CONCAT(DISTINCT e.auth_type) AS auth_types
          FROM mcp_analytics_events e
          GROUP BY e.user_id
          HAVING tool_calls_all_time > 0
             OR tokens_created > 0
             OR client_connected_at IS NOT NULL
        )
        SELECT
          a.user_id,
          u.username,
          u.email,
          u.plan,
          a.tokens_created,
          a.first_token_at,
          a.client_connected_at,
          a.tool_calls_period,
          a.tool_calls_all_time,
          a.active_days_period,
          a.last_tool_call_at,
          a.auth_types
        FROM agg a
        JOIN users u ON u.id = a.user_id
        ORDER BY COALESCE(a.last_tool_call_at, '1970-01-01') DESC,
                 COALESCE(a.first_token_at, '1970-01-01') DESC
        LIMIT 200
      `,
      args: [since, since],
    }),
  ]);

  const f = funnelRes.rows[0] ?? {};
  const funnel: McpFunnelStats = {
    profileViews: num(f.profile_views),
    tokensCreated: num(f.tokens_created),
    usersWithTokens: num(f.users_with_tokens),
    clientsConnected: num(f.clients_connected),
    activeUsers: num(f.active_users),
    totalToolCalls: num(f.total_tool_calls),
  };

  return {
    periodDays: days,
    funnel,
    dailyToolCalls: dailyRes.rows.map((r) => ({
      date: str(r.d),
      calls: num(r.calls),
      users: num(r.users),
    })),
    toolBreakdown: toolsRes.rows.map((r) => ({
      tool: str(r.tool),
      count: num(r.cnt),
    })),
    recurrence: recurrenceRes.rows.map((r) => ({
      bucket: str(r.bucket),
      users: num(r.users),
    })),
    users: usersRes.rows.map((r) => ({
      userId: str(r.user_id),
      username: str(r.username),
      email: str(r.email),
      plan: str(r.plan),
      tokensCreated: num(r.tokens_created),
      firstTokenAt: str(r.first_token_at) || null,
      clientConnectedAt: str(r.client_connected_at) || null,
      toolCallsPeriod: num(r.tool_calls_period),
      toolCallsAllTime: num(r.tool_calls_all_time),
      activeDaysPeriod: num(r.active_days_period),
      lastToolCallAt: str(r.last_tool_call_at) || null,
      authTypes: str(r.auth_types),
    })),
  };
}
