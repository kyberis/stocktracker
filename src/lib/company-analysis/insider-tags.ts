export type InsiderSignalTag = "tag-buy" | "tag-sell" | "tag-neutral";

/**
 * Classify Form 4-style transaction text.
 * RSU / option exercise / tax withholding → neutral.
 * Open-market purchases/sales → buy/sell.
 */
export function classifyInsiderTransaction(transactionType: string): InsiderSignalTag {
  const t = transactionType.toLowerCase();
  if (
    /rsu|restricted|option|exercise|award|grant|tax|withhold|f-1|m-1|code\s*m|code\s*f|gift|conversion/.test(
      t,
    )
  ) {
    return "tag-neutral";
  }
  if (/purchase|buy|p-purchase|code\s*p\b|acquired|acquisition/.test(t)) {
    return "tag-buy";
  }
  if (/sale|sell|s-sale|code\s*s\b|disposed|disposition/.test(t)) {
    return "tag-sell";
  }
  return "tag-neutral";
}
