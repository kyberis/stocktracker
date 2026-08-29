import {
  buildConversationProgressAppendix,
  type WarrenThreadMessage,
} from "./conversation-progress-intent";
import { buildMoatScreenerPrefetchAppendix } from "./moat-screener-intent";
import { buildPortfolioHoldingPrefetchAppendix } from "./portfolio-holding-intent";
import { buildPriceMovePrefetchAppendix } from "./price-move-intent";
import {
  buildAmbiguousPositionWriteAppendix,
  buildExplicitDeleteHistoryAppendix,
} from "./position-write-intent";
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
  // Portfolio writes must win over valuation / progress — otherwise Warren may
  // delete a holding when the user meant to log a sale (or the reverse).
  const recordTx = buildRecordTransactionPrefetchAppendix(message);
  const deleteHistory = recordTx ? null : buildExplicitDeleteHistoryAppendix(message);
  const ambiguousWrite =
    recordTx || deleteHistory ? null : buildAmbiguousPositionWriteAppendix(message);
  const writeOverride = recordTx || deleteHistory || ambiguousWrite;

  const [valuation, moat, holding, priceMove] = await Promise.all([
    writeOverride || progress ? Promise.resolve(null) : buildValuationPrefetchAppendix(message, opts),
    buildMoatScreenerPrefetchAppendix(message),
    writeOverride ? Promise.resolve(null) : buildPortfolioHoldingPrefetchAppendix(message, opts),
    writeOverride || progress ? Promise.resolve(null) : buildPriceMovePrefetchAppendix(message, opts),
  ]);
  const parts = [recordTx, deleteHistory, ambiguousWrite, valuation, moat, holding, priceMove, progress].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join("\n\n") : null;
}
