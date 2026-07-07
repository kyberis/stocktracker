import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import type { PortfolioSnapshot } from "@/lib/ai/warren/tools";
import { findUserById, getDefaultPortfolio } from "@/lib/db";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

export async function getPortfolioSummaryForUser(
  userId: string,
  opts?: {
    portfolioId?: string;
    baseCurrency?: string;
    includeDividends?: boolean;
    includeGoals?: boolean;
  },
): Promise<ServiceResult<PortfolioSnapshot>> {
  const user = await findUserById(userId);
  if (!user) return serviceErr("User not found", "user_not_found");

  let baseCurrency = opts?.baseCurrency;
  if (!baseCurrency) {
    const defaultPortfolio = await getDefaultPortfolio(userId);
    baseCurrency = defaultPortfolio?.currency || "EUR";
  }

  const enrich = opts?.includeDividends === true || opts?.includeGoals === true;
  const snapshot = await buildPortfolioSnapshot({
    userId,
    portfolioId: opts?.portfolioId,
    baseCurrency,
    enrichForPortfolioAi: enrich,
  });

  return { ok: true, data: snapshot };
}
