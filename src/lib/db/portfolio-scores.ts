import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

export interface CachedPortfolioScore {
  id: string;
  userId: string;
  portfolioId: string;
  scoreJson: string;
  createdAt: string;
  expiresAt: string;
}

export async function getCachedPortfolioScore(
  userId: string,
  portfolioId: string,
): Promise<CachedPortfolioScore | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, portfolio_id, score_json, created_at, expires_at
          FROM portfolio_scores
          WHERE user_id = ? AND portfolio_id = ?
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId, portfolioId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: str(row.id),
    userId: str(row.user_id),
    portfolioId: str(row.portfolio_id),
    scoreJson: str(row.score_json),
    createdAt: str(row.created_at),
    expiresAt: str(row.expires_at),
  };
}

export async function getPortfolioScoreHistory(
  userId: string,
  portfolioId: string,
  limit = 10,
): Promise<CachedPortfolioScore[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, portfolio_id, score_json, created_at, expires_at
          FROM portfolio_scores
          WHERE user_id = ? AND portfolio_id = ?
          ORDER BY created_at DESC LIMIT ?`,
    args: [userId, portfolioId, limit],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    userId: str(row.user_id),
    portfolioId: str(row.portfolio_id),
    scoreJson: str(row.score_json),
    createdAt: str(row.created_at),
    expiresAt: str(row.expires_at),
  }));
}

export async function savePortfolioScore(
  userId: string,
  portfolioId: string,
  scoreJson: string,
): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO portfolio_scores (id, user_id, portfolio_id, score_json, created_at, expires_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+100 years'))`,
    args: [id, userId, portfolioId, scoreJson],
  });
  return id;
}

export async function deleteExpiredPortfolioScores(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "DELETE FROM portfolio_scores WHERE expires_at <= datetime('now')"
  );
  return result.rowsAffected;
}
