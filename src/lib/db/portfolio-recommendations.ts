import { ensureInitialized } from "./client";
import { str } from "./helpers";

export type RecommendationStatus = "skipped" | "acted";

export interface PortfolioRecommendationStateRow {
  userId: string;
  recommendationKey: string;
  status: RecommendationStatus;
  updatedAt: string;
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
