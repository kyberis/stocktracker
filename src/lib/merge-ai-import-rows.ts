import type { ExtractedHolding, ExtractedTransaction } from "@/hooks/import-types";

/**
 * AI portfolio extraction often returns **transactions** (with dates) for equities and
 * **holdings** (positions without trade dates) for bonds or odd rows. Import UI previously
 * used only transactions when both arrays were non-empty, so position-only rows never
 * became synthetic buys. Merge synthetic buys from holdings that are not already covered
 * by ticker or ISIN in `transactions`.
 */
export function mergeHoldingsIntoTransactions(
  holdings: ExtractedHolding[],
  transactions: ExtractedTransaction[],
): ExtractedTransaction[] {
  if (holdings.length === 0) return transactions;
  if (transactions.length === 0) {
    return holdings.map((h) => holdingToSyntheticBuy(h));
  }

  const seen = new Set<string>();
  for (const t of transactions) {
    const tick = (t.ticker || "").toUpperCase();
    const isin = (t.isin || "").toUpperCase();
    if (tick) seen.add(tick);
    if (isin) seen.add(isin);
  }

  const extra = holdings
    .filter((h) => {
      const tick = (h.ticker || "").toUpperCase();
      return tick && !seen.has(tick);
    })
    .map((h) => holdingToSyntheticBuy(h));

  return [...extra, ...transactions];
}

function holdingToSyntheticBuy(h: ExtractedHolding): ExtractedTransaction {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: "buy",
    ticker: h.ticker,
    name: h.name,
    shares: h.shares,
    pricePerShare: h.purchasePrice,
    totalAmount: h.shares * h.purchasePrice,
    fees: 0,
    currency: h.displayCurrency || "EUR",
  };
}
