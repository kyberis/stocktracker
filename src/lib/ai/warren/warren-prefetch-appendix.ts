import { buildMoatScreenerPrefetchAppendix } from "./moat-screener-intent";
import { buildPortfolioHoldingPrefetchAppendix } from "./portfolio-holding-intent";
import { buildValuationPrefetchAppendix } from "./valuation-intent";
import type { PortfolioSnapshot } from "./tools";

export async function buildWarrenPrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  const [valuation, moat, holding] = await Promise.all([
    buildValuationPrefetchAppendix(message, opts),
    buildMoatScreenerPrefetchAppendix(message),
    buildPortfolioHoldingPrefetchAppendix(message, opts),
  ]);
  const parts = [valuation, moat, holding].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}
