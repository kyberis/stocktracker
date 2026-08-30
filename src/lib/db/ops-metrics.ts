import { ensureInitialized } from "./client";
import { sqlExcludeTestAccountEmail } from "@/lib/test-accounts";

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

const EXCLUDE_TEST_EMAIL = sqlExcludeTestAccountEmail("email");
const EXCLUDE_TEST_USERS = sqlExcludeTestAccountEmail("u.email");

/**
 * Aggregates only — for IdP ops digest (Bearer IDP_SERVICE_TOKEN).
 * Excludes @trefolio.com / example.com test accounts from user and event counts.
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
    client.execute(`SELECT COUNT(*) as cnt FROM users WHERE ${EXCLUDE_TEST_EMAIL}`),
    client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro' AND ${EXCLUDE_TEST_EMAIL}`),
    client.execute(`SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND ${EXCLUDE_TEST_EMAIL}`),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM users WHERE created_at >= datetime('now', '-7 days') AND ${EXCLUDE_TEST_EMAIL}`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback f
            INNER JOIN users u ON u.id = f.user_id
            WHERE f.created_at >= datetime('now', '-30 days')
              AND f.status = 'open'
              AND ${EXCLUDE_TEST_USERS}`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback f
            INNER JOIN users u ON u.id = f.user_id
            WHERE f.created_at >= datetime('now', '-30 days')
              AND ${EXCLUDE_TEST_USERS}`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM feedback f
            INNER JOIN users u ON u.id = f.user_id
            WHERE f.created_at >= datetime('now', '-30 days')
              AND f.linear_issue_id IS NOT NULL AND f.linear_issue_id != ''
              AND ${EXCLUDE_TEST_USERS}`,
      args: [],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as cnt FROM analytics_events ae
            INNER JOIN users u ON u.id = ae.user_id
            WHERE ae.created_at >= datetime('now', '-1 day')
              AND ${EXCLUDE_TEST_USERS}`,
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
