import { buildMoatScreenerPrefetchAppendix } from "./moat-screener-intent";
import { buildPortfolioHoldingPrefetchAppendix } from "./portfolio-holding-intent";
import type { PortfolioSnapshot } from "./tools";

export async function buildWarrenPrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  const [moat, holding] = await Promise.all([
    buildMoatScreenerPrefetchAppendix(message),
    buildPortfolioHoldingPrefetchAppendix(message, opts),
  ]);
  const parts = [moat, holding].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}
