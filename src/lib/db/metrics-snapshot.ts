import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import { sqlExcludeTestAccountEmail } from "@/lib/test-accounts";

export interface MetricsSnapshot {
  freeUsers: number;
  basicUsers: number;
  proUsers: number;
  wealthUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  holdingsCount: number;
  transactionsCount: number;
  eventsLast24h: { event: string; count: number }[];
}

const EXCLUDE_TEST_EMAIL = sqlExcludeTestAccountEmail("email");
const EXCLUDE_TEST_USERS = sqlExcludeTestAccountEmail("u.email");

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const client = await ensureInitialized();

  const [freeUsers, basicUsers, proUsers, wealthUsers, active7d, active30d, holdings, transactions, events24h] =
    await Promise.all([
      client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'free' AND ${EXCLUDE_TEST_EMAIL}`),
      client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'basic' AND ${EXCLUDE_TEST_EMAIL}`),
      client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro' AND ${EXCLUDE_TEST_EMAIL}`),
      client.execute(`SELECT COUNT(*) as cnt FROM users WHERE plan = 'wealth' AND ${EXCLUDE_TEST_EMAIL}`),
      client.execute({
        sql: `SELECT COUNT(DISTINCT ae.user_id) as cnt FROM analytics_events ae
              INNER JOIN users u ON u.id = ae.user_id
              WHERE ae.created_at >= datetime('now', '-7 days')
                AND ${EXCLUDE_TEST_USERS}`,
      }),
      client.execute({
        sql: `SELECT COUNT(DISTINCT ae.user_id) as cnt FROM analytics_events ae
              INNER JOIN users u ON u.id = ae.user_id
              WHERE ae.created_at >= datetime('now', '-30 days')
                AND ${EXCLUDE_TEST_USERS}`,
      }),
      client.execute(`SELECT COUNT(*) as cnt FROM holdings h
                     INNER JOIN users u ON u.id = h.user_id
                     WHERE ${EXCLUDE_TEST_USERS}`),
      client.execute(`SELECT COUNT(*) as cnt FROM transactions t
                     INNER JOIN users u ON u.id = t.user_id
                     WHERE ${EXCLUDE_TEST_USERS}`),
      client.execute({
        sql: `SELECT ae.event, COUNT(*) as cnt FROM analytics_events ae
              INNER JOIN users u ON u.id = ae.user_id
              WHERE ae.created_at >= datetime('now', '-1 day')
                AND ${EXCLUDE_TEST_USERS}
              GROUP BY ae.event ORDER BY cnt DESC`,
      }),
    ]);

  return {
    freeUsers: num(freeUsers.rows[0]?.cnt),
    basicUsers: num(basicUsers.rows[0]?.cnt),
    proUsers: num(proUsers.rows[0]?.cnt),
    wealthUsers: num(wealthUsers.rows[0]?.cnt),
    activeUsers7d: num(active7d.rows[0]?.cnt),
    activeUsers30d: num(active30d.rows[0]?.cnt),
    holdingsCount: num(holdings.rows[0]?.cnt),
    transactionsCount: num(transactions.rows[0]?.cnt),
    eventsLast24h: events24h.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
  };
}
