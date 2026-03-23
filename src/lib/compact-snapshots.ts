import { ensureInitialized } from "@/lib/db/client";

/**
 * Snapshot compaction job — reduces intraday (5-min) rows to bound DB growth.
 *
 * Retention policy:
 * - Last 48h:  keep all 5-min rows  (serves 1D chart)
 * - 2–7 days:  keep 1 row per hour  (serves 1W chart)
 * - >7 days:   keep 1 row per day   (serves 1M+ charts)
 *
 * Only targets intraday rows (date contains a space, e.g. "2026-03-22 14:35:00").
 * Daily backfill rows ("2026-03-22") are never touched.
 */
export async function runSnapshotCompaction(): Promise<Record<string, unknown>> {
  const client = await ensureInitialized();

  const now = new Date();
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().slice(0, 16).replace("T", " ") + ":00";

  const bound48h = fmt(cutoff48h);
  const bound7d = fmt(cutoff7d);

  // Phase 1: Compact rows 2–7 days old → keep last per hour
  // For each (user_id, portfolio_id, hour-bucket), keep the row with the latest date.
  const hourlyDeleted = await client.execute({
    sql: `DELETE FROM portfolio_snapshots
          WHERE date LIKE '% %'
            AND date < ?
            AND date >= ?
            AND id NOT IN (
              SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                  PARTITION BY user_id, portfolio_id, substr(date, 1, 13)
                  ORDER BY date DESC
                ) AS rn
                FROM portfolio_snapshots
                WHERE date LIKE '% %'
                  AND date < ?
                  AND date >= ?
              ) WHERE rn = 1
            )`,
    args: [bound48h, bound7d, bound48h, bound7d],
  });

  // Phase 2: Compact rows >7 days old → keep last per day
  const dailyDeleted = await client.execute({
    sql: `DELETE FROM portfolio_snapshots
          WHERE date LIKE '% %'
            AND date < ?
            AND id NOT IN (
              SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                  PARTITION BY user_id, portfolio_id, substr(date, 1, 10)
                  ORDER BY date DESC
                ) AS rn
                FROM portfolio_snapshots
                WHERE date LIKE '% %'
                  AND date < ?
              ) WHERE rn = 1
            )`,
    args: [bound7d, bound7d],
  });

  return {
    hourlyCompacted: hourlyDeleted.rowsAffected ?? 0,
    dailyCompacted: dailyDeleted.rowsAffected ?? 0,
    bounds: { hourly: bound48h, daily: bound7d },
  };
}
