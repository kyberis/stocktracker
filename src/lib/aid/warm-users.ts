import { ensureInitialized } from "@/lib/db/client";
import { isFeatureEnabled } from "@/lib/db/settings";
import { MARKET_DATA_CRON_ACTIVE_DAYS } from "@/lib/db/holdings";
import { sqlExcludeTestAccountEmail } from "@/lib/test-accounts";

/** Users to pre-warm AID digest cache (cron): recently active, non-test. */
export async function listAidWarmUserIds(limit = 25): Promise<string[]> {
  const client = await ensureInitialized();
  const ids: string[] = [];
  const seen = new Set<string>();

  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  const activeClause = `u.last_active_at != ''
            AND datetime(u.last_active_at) >= datetime('now', ?)
            AND (u.deleted_at IS NULL OR u.deleted_at = '')
            AND ${sqlExcludeTestAccountEmail("u.email")}`;
  const activeArgs = [`-${MARKET_DATA_CRON_ACTIVE_DAYS} days`];

  const overrides = await client.execute({
    sql: `SELECT o.user_id
          FROM feature_flag_overrides o
          INNER JOIN users u ON u.id = o.user_id
          WHERE o.flag = 'aid_beta' AND o.enabled = 1
            AND ${activeClause}
          ORDER BY datetime(u.last_active_at) DESC
          LIMIT ?`,
    args: [...activeArgs, limit],
  });
  for (const row of overrides.rows) {
    push(String(row.user_id));
  }

  if (ids.length >= limit) return ids.slice(0, limit);

  const globalOn = await isFeatureEnabled("aid_beta");
  if (globalOn) {
    const recent = await client.execute({
      sql: `SELECT c.user_id AS user_id
            FROM aid_news_cache c
            INNER JOIN users u ON u.id = c.user_id
            WHERE ${activeClause}
            GROUP BY c.user_id
            ORDER BY MAX(c.fetched_at) DESC
            LIMIT ?`,
      args: [...activeArgs, limit],
    });
    for (const row of recent.rows) {
      push(String(row.user_id));
      if (ids.length >= limit) break;
    }
  }

  return ids.slice(0, limit);
}
