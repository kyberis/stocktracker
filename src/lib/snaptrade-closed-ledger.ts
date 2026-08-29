import { canonicalExchangeCode } from "@/lib/db/helpers";
import { normalizeHkYahooSymbol } from "@/lib/market-symbol";
import type { Holding, Transaction } from "@/lib/types";

function venueKey(ticker: string, exchange: string): string {
  const ex = canonicalExchangeCode(exchange) || (exchange || "").toUpperCase();
  return `${normalizeHkYahooSymbol(ticker).toUpperCase()}|${ex}`;
}

function isSnaptradeSourceRef(sourceRef: string | undefined): boolean {
  return typeof sourceRef === "string" && sourceRef.startsWith("snaptrade-");
}

/**
 * True when every buy/sell for this ticker+venue comes from SnapTrade.
 * Incomplete broker activity history must not resurrect a position the live
 * positions snapshot says is closed.
 */
export function isSnaptradeOnlyTradeLedger(
  transactions: Array<Pick<Transaction, "type" | "ticker" | "exchange" | "sourceRef">>,
  ticker: string,
  exchange: string,
): boolean {
  const key = venueKey(ticker, exchange);
  const trades = transactions.filter((tx) => {
    if (tx.type !== "buy" && tx.type !== "sell") return false;
    return venueKey(tx.ticker, tx.exchange || "") === key;
  });
  if (trades.length === 0) return false;
  return trades.every((tx) => isSnaptradeSourceRef(tx.sourceRef));
}

/**
 * Drop transaction-derived lots that are SnapTrade-only in the ledger but
 * absent from the live broker positions set. Requires a non-empty open
 * SnapTrade snapshot so we know the sync was healthy enough to trust absences.
 */
export function filterClosedSnaptradeLedgerHoldings<T extends Pick<Holding, "ticker" | "exchange">>(
  derived: T[],
  transactions: Array<Pick<Transaction, "type" | "ticker" | "exchange" | "sourceRef">>,
  openSnaptradeKeys: Set<string>,
): T[] {
  if (openSnaptradeKeys.size === 0) return derived;

  return derived.filter((h) => {
    const key = venueKey(h.ticker, h.exchange);
    if (openSnaptradeKeys.has(key)) return false;
    if (isSnaptradeOnlyTradeLedger(transactions, h.ticker, h.exchange)) return false;
    return true;
  });
}
