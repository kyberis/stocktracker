import { ensureInitialized } from "./client";
import { num, str } from "./helpers";

export interface WeeklyDigestRow {
  id: string;
  userId: string;
  portfolioId: string;
  weekStart: string;
  weekEnd: string;
  summaryText: string;
  stats: WeeklyDigestStats;
  createdAt: string;
}

export interface WeeklyDigestStats {
  weekChange?: number;
  weekChangePct?: number;
  /** Calendar day (YYYY-MM-DD) of the portfolio snapshot used as baseline for weekChange. */
  weekChangeBaselineDate?: string;
  /** Estimated buy minus sell amounts in EUR for the digest week (excludes dividends/fees). */
  netBuyFlowEUR?: number;
  bestPerformer?: { ticker: string; changePct: number };
  worstPerformer?: { ticker: string; changePct: number };
  dividendsReceived?: number;
  totalValue?: number;
  holdingCount?: number;
  currency?: string;
}

function parseStats(raw: string): WeeklyDigestStats {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function getLatestDigest(userId: string, portfolioId?: string): Promise<WeeklyDigestRow | null> {
  const client = await ensureInitialized();
  const sql = portfolioId
    ? "SELECT * FROM weekly_digests WHERE user_id = ? AND portfolio_id = ? ORDER BY week_end DESC LIMIT 1"
    : "SELECT * FROM weekly_digests WHERE user_id = ? ORDER BY week_end DESC LIMIT 1";
  const args = portfolioId ? [userId, portfolioId] : [userId];
  const result = await client.execute({ sql, args });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: str(row.id),
    userId: str(row.user_id),
    portfolioId: str(row.portfolio_id),
    weekStart: str(row.week_start),
    weekEnd: str(row.week_end),
    summaryText: str(row.summary_text),
    stats: parseStats(str(row.stats_json)),
    createdAt: str(row.created_at),
  };
}

export async function insertDigest(params: {
  userId: string;
  portfolioId: string;
  weekStart: string;
  weekEnd: string;
  summaryText: string;
  stats: WeeklyDigestStats;
}): Promise<string> {
  const client = await ensureInitialized();
  const id = crypto.randomUUID().replace(/-/g, "");
  await client.execute({
    sql: `INSERT INTO weekly_digests (id, user_id, portfolio_id, week_start, week_end, summary_text, stats_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, params.userId, params.portfolioId, params.weekStart, params.weekEnd, params.summaryText, JSON.stringify(params.stats)],
  });
  return id;
}

export async function getDigestEligibleUsers(): Promise<{ id: string; email: string; displayName: string; defaultPortfolioId: string }[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name,
            COALESCE(
              (SELECT p.id FROM portfolios p WHERE p.user_id = u.id AND p.is_default = 1 LIMIT 1),
              (SELECT p.id FROM portfolios p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)
            ) as default_portfolio_id
          FROM users u
          WHERE u.plan = 'pro'
            AND u.weekly_digest_enabled = 1
            AND u.email != ''
            AND u.email_verified = 1
            AND NOT EXISTS (
              SELECT 1 FROM user_settings us
              WHERE us.user_id = u.id AND us.email_notifications_enabled = 0
            )
            AND EXISTS (SELECT 1 FROM holdings h WHERE h.user_id = u.id)`,
    args: [],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    email: str(row.email),
    displayName: str(row.display_name),
    defaultPortfolioId: str(row.default_portfolio_id),
  }));
}

export async function hasDigestForWeek(userId: string, weekEnd: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT 1 FROM weekly_digests WHERE user_id = ? AND week_end = ? LIMIT 1",
    args: [userId, weekEnd],
  });
  return result.rows.length > 0;
}

/**
 * Latest holdings snapshot on or before week start (holdings only; cash excluded).
 * Uses calendar date comparison so intraday rows on the week-start day are included.
 */
export async function getDigestBaselineSnapshot(
  userId: string,
  portfolioId: string,
  weekStart: string,
): Promise<{ totalValueEur: number; snapshotDay: string } | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT total_value_eur, date FROM portfolio_snapshots
          WHERE user_id = ? AND portfolio_id = ? AND substr(date, 1, 10) <= ?
          ORDER BY date DESC LIMIT 1`,
    args: [userId, portfolioId, weekStart],
  });
  if (result.rows.length === 0) return null;
  const rawDate = str(result.rows[0].date);
  const snapshotDay = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
  const totalValueEur = num(result.rows[0].total_value_eur);
  if (!Number.isFinite(totalValueEur) || totalValueEur <= 0) return null;
  return { totalValueEur, snapshotDay };
}
