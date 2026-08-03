import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { PortfolioRecommendation } from "@/lib/homepage/build-portfolio-recommendations";

export type RecommendationStatus = "skipped" | "acted";

export interface PortfolioRecommendationStateRow {
  userId: string;
  recommendationKey: string;
  status: RecommendationStatus;
  updatedAt: string;
}

export interface PortfolioRecommendationCacheRow {
  userId: string;
  portfolioId: string;
  weekKey: string;
  queue: PortfolioRecommendation[];
  computedAt: string;
}

export async function listRecommendationStates(
  userId: string,
): Promise<PortfolioRecommendationStateRow[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT user_id, recommendation_key, status, updated_at
          FROM portfolio_recommendation_state
          WHERE user_id = ?`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    recommendationKey: str(r.recommendation_key),
    status: str(r.status) as RecommendationStatus,
    updatedAt: str(r.updated_at),
  }));
}

export async function upsertRecommendationState(
  userId: string,
  recommendationKey: string,
  status: RecommendationStatus,
): Promise<void> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO portfolio_recommendation_state (user_id, recommendation_key, status, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, recommendation_key) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [userId, recommendationKey, status, now],
  });
}

/** Clear only skipped tips so a new weekly run can re-surface them; keep acted. */
export async function clearSkippedRecommendationStates(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `DELETE FROM portfolio_recommendation_state
          WHERE user_id = ? AND status = 'skipped'`,
    args: [userId],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function getRecommendationCache(
  userId: string,
  portfolioId: string,
): Promise<PortfolioRecommendationCacheRow | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT user_id, portfolio_id, week_key, queue_json, computed_at
          FROM portfolio_recommendation_cache
          WHERE user_id = ? AND portfolio_id = ?`,
    args: [userId, portfolioId],
  });
  const row = result.rows[0];
  if (!row) return null;
  let queue: PortfolioRecommendation[] = [];
  try {
    const parsed = JSON.parse(str(row.queue_json));
    queue = Array.isArray(parsed) ? (parsed as PortfolioRecommendation[]) : [];
  } catch {
    queue = [];
  }
  return {
    userId: str(row.user_id),
    portfolioId: str(row.portfolio_id),
    weekKey: str(row.week_key),
    queue,
    computedAt: str(row.computed_at),
  };
}

export async function upsertRecommendationCache(
  userId: string,
  portfolioId: string,
  weekKey: string,
  queue: PortfolioRecommendation[],
): Promise<void> {
  const client = await ensureInitialized();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO portfolio_recommendation_cache
            (user_id, portfolio_id, week_key, queue_json, computed_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, portfolio_id) DO UPDATE SET
            week_key = excluded.week_key,
            queue_json = excluded.queue_json,
            computed_at = excluded.computed_at`,
    args: [userId, portfolioId, weekKey, JSON.stringify(queue), now],
  });
}

/** ISO week key e.g. 2026-W32 (UTC). */
export function currentRecommendationWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
