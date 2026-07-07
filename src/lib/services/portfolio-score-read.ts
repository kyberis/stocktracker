import { getCachedPortfolioScore, getPortfolioScoreHistory, isFeatureEnabledForUser } from "@/lib/db";
import type { PortfolioScoreResponse } from "@/lib/portfolio-score";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

export interface PortfolioScoreReadResult {
  score: PortfolioScoreResponse | null;
  scoreId?: string;
  cachedAt?: string;
}

export async function getPortfolioScoreForUser(
  userId: string,
  opts?: { portfolioId?: string; history?: boolean },
): Promise<ServiceResult<PortfolioScoreReadResult | { scores: Array<{ id: string; score: PortfolioScoreResponse; createdAt: string }> }>> {
  if (!userId) return serviceErr("userId is required", "invalid_input");

  if (!(await isFeatureEnabledForUser("ai_report_enabled", userId))) {
    return serviceErr("Portfolio score (AI report) is disabled for this account.", "not_found");
  }

  const portfolioId = opts?.portfolioId ?? "";

  if (opts?.history) {
    const rows = await getPortfolioScoreHistory(userId, portfolioId, 20);
    const scores = rows
      .map((r) => {
        try {
          return {
            id: r.id,
            score: JSON.parse(r.scoreJson) as PortfolioScoreResponse,
            createdAt: r.createdAt,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ id: string; score: PortfolioScoreResponse; createdAt: string }>;
    return { ok: true, data: { scores } };
  }

  const cached = await getCachedPortfolioScore(userId, portfolioId);
  if (!cached) {
    return { ok: true, data: { score: null } };
  }

  try {
    const score = JSON.parse(cached.scoreJson) as PortfolioScoreResponse;
    return {
      ok: true,
      data: { score, scoreId: cached.id, cachedAt: cached.createdAt },
    };
  } catch {
    return { ok: true, data: { score: null } };
  }
}
