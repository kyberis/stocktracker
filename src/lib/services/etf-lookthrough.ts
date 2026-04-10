import type { Holding, QuoteData } from "@/lib/types";

/** Matches enrich-classifications.ts — funds often lack assetType=etf after import. */
export const ETF_NAME_PATTERNS =
  /\bETF\b|\bUCITS\b|\biShares\b|\bVanguard\b|\bSPDR\b|\bAmundi\b|\bXtrackers\b|\bInvesco\b|\bWisdomTree\b/i;

/**
 * Whether a position should use ETF sector look-through (Yahoo fund sector weights).
 * Uses assetType, optional quote metadata, and name heuristics (imports often leave assetType as stock).
 */
export function holdingIsEtfLike(
  h: Holding,
  quote?: QuoteData & { quoteType?: string },
): boolean {
  if (h.assetType === "etf") return true;
  if (quote?.quoteType && /ETF|MUTUALFUND|INDEX/i.test(String(quote.quoteType))) return true;
  if (h.assetType === "crypto") return false;
  return ETF_NAME_PATTERNS.test(h.name);
}
