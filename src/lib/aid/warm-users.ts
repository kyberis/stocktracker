import { ensureInitialized } from "@/lib/db/client";
import { isFeatureEnabled } from "@/lib/db/settings";

/** Users to pre-warm AID digest cache (cron). */
export async function listAidWarmUserIds(limit = 25): Promise<string[]> {
  const client = await ensureInitialized();
  const ids = new Set<string>();

  const overrides = await client.execute({
    sql: "SELECT user_id FROM feature_flag_overrides WHERE flag = 'aid_beta' AND enabled = 1",
  });
  for (const row of overrides.rows) {
    ids.add(String(row.user_id));
  }

  const globalOn = await isFeatureEnabled("aid_beta");
  if (globalOn) {
    const recent = await client.execute({
      sql: `SELECT user_id FROM aid_news_cache
            GROUP BY user_id
            ORDER BY MAX(fetched_at) DESC
            LIMIT ?`,
      args: [limit],
    });
    for (const row of recent.rows) {
      ids.add(String(row.user_id));
    }
  }

  return [...ids].slice(0, limit);
}
