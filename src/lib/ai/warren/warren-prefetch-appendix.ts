import {
  buildConversationProgressAppendix,
  type WarrenThreadMessage,
} from "./conversation-progress-intent";
import { buildMoatScreenerPrefetchAppendix } from "./moat-screener-intent";
import { buildPortfolioHoldingPrefetchAppendix } from "./portfolio-holding-intent";
import { buildPriceMovePrefetchAppendix } from "./price-move-intent";
import { buildValuationPrefetchAppendix } from "./valuation-intent";
import type { PortfolioSnapshot } from "./tools";

export async function buildWarrenPrefetchAppendix(
  message: string,
  opts: {
    userId: string;
    portfolioId?: string;
    snapshot?: PortfolioSnapshot;
    recentMessages?: WarrenThreadMessage[];
  },
): Promise<string | null> {
  const thread: WarrenThreadMessage[] =
    opts.recentMessages ?? [{ role: "user", content: message }];
  const progress = buildConversationProgressAppendix(thread);

  const [valuation, moat, holding, priceMove] = await Promise.all([
    progress ? Promise.resolve(null) : buildValuationPrefetchAppendix(message, opts),
    buildMoatScreenerPrefetchAppendix(message),
    buildPortfolioHoldingPrefetchAppendix(message, opts),
    progress ? Promise.resolve(null) : buildPriceMovePrefetchAppendix(message, opts),
  ]);
  const parts = [valuation, moat, holding, priceMove, progress].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}
