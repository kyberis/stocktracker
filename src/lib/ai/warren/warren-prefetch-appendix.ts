import {
  buildConversationProgressAppendix,
  type WarrenThreadMessage,
} from "./conversation-progress-intent";
import { buildMoatScreenerPrefetchAppendix } from "./moat-screener-intent";
import { buildPortfolioHoldingPrefetchAppendix } from "./portfolio-holding-intent";
import { buildPriceMovePrefetchAppendix } from "./price-move-intent";
import { buildRecordTransactionPrefetchAppendix } from "./record-transaction-intent";
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
  // Record-sale / record-buy must win over valuation / progress — otherwise
  // Warren may delete a holding via proposeRemoveHolding instead of logging a sell.
  const recordTx = buildRecordTransactionPrefetchAppendix(message);

  const [valuation, moat, holding, priceMove] = await Promise.all([
    recordTx || progress ? Promise.resolve(null) : buildValuationPrefetchAppendix(message, opts),
    buildMoatScreenerPrefetchAppendix(message),
    recordTx ? Promise.resolve(null) : buildPortfolioHoldingPrefetchAppendix(message, opts),
    recordTx || progress ? Promise.resolve(null) : buildPriceMovePrefetchAppendix(message, opts),
  ]);
  const parts = [recordTx, valuation, moat, holding, priceMove, progress].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}
