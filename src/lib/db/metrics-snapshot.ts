import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export interface MetricsSnapshot {
  freeUsers: number;
  proUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  holdingsCount: number;
  transactionsCount: number;
  eventsLast24h: { event: string; count: number }[];
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const client = await ensureInitialized();

  const [freeUsers, proUsers, active7d, active30d, holdings, transactions, events24h] =
    await Promise.all([
      client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan = 'free'"),
      client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro'"),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-7 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-30 days')",
      }),
      client.execute("SELECT COUNT(*) as cnt FROM holdings"),
      client.execute("SELECT COUNT(*) as cnt FROM transactions"),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
              WHERE created_at >= datetime('now', '-1 day')
              GROUP BY event ORDER BY cnt DESC`,
      }),
    ]);

  return {
    freeUsers: num(freeUsers.rows[0]?.cnt),
    proUsers: num(proUsers.rows[0]?.cnt),
    activeUsers7d: num(active7d.rows[0]?.cnt),
    activeUsers30d: num(active30d.rows[0]?.cnt),
    holdingsCount: num(holdings.rows[0]?.cnt),
    transactionsCount: num(transactions.rows[0]?.cnt),
    eventsLast24h: events24h.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
  };
}
