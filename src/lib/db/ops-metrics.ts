import { ensureInitialized } from "./client";

export type WarrenOpsMetricsTotals = {
  users_total: number;
  users_plan_pro: number;
  users_admin: number;
  signups_7d: number;
  feedback_open_30d: number;
  feedback_total_30d: number;
  feedback_with_linear_30d: number;
  analytics_events_24h: number;
};

/**
 * Aggregates only — for IdP ops digest (Bearer IDP_SERVICE_TOKEN).
 */
export async function getWarrenOpsMetrics(): Promise<WarrenOpsMetricsTotals> {
  const client = await ensureInitialized();

  const [
    usersTotal,
    usersPro,
    usersAdmin,
    signups7d,
    fbOpen,
    fbTotal,
    fbLinear,
    ev24,
  ] = await Promise.all([
    client.execute(`SELECT COUNT(*) as cnt FROM users`),
    client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro'`),
    client.execute(`SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM users WHERE created_at >= datetime('now', '-7 days')`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback
            WHERE created_at >= datetime('now', '-30 days')
              AND status = 'open'`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback WHERE created_at >= datetime('now', '-30 days')`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback
            WHERE created_at >= datetime('now', '-30 days')
              AND linear_issue_id IS NOT NULL AND linear_issue_id != ''`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-1 day')`,
      args: [],
    }),
  ]);

  const num = (r: typeof usersTotal) => Number(r.rows[0]?.cnt) || 0;

  return {
    users_total: num(usersTotal),
    users_plan_pro: num(usersPro),
    users_admin: num(usersAdmin),
    signups_7d: num(signups7d),
    feedback_open_30d: num(fbOpen),
    feedback_total_30d: num(fbTotal),
    feedback_with_linear_30d: num(fbLinear),
    analytics_events_24h: num(ev24),
  };
}
