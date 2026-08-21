import { canonicalExchangeCode } from "@/lib/db/helpers";
import { normalizeHkYahooSymbol } from "@/lib/market-symbol";
import type { Holding, HoldingAssetType, Transaction } from "@/lib/types";

interface HoldingMetadata {
  id: string;
  name: string;
  isin: string;
  assetType: HoldingAssetType;
  displayCurrency: string;
  sector?: string;
  region?: string;
  assetClass?: string;
  accountId?: string;
  tags?: string[];
}

interface AggregateState {
  ticker: string;
  exchange: string;
  shares: number;
  costAmount: number;
  name: string;
  displayCurrency: string;
  isin: string;
  assetType: HoldingAssetType;
  accountId: string;
}

function holdingKey(ticker: string, exchange: string): string {
  return `${ticker.toUpperCase()}|${canonicalExchangeCode(exchange)}`;
}

function lookupMeta(
  metadataByKey: Map<string, HoldingMetadata>,
  ticker: string,
  exchange: string,
): HoldingMetadata | undefined {
  const canonical = holdingKey(ticker, exchange);
  if (metadataByKey.has(canonical)) return metadataByKey.get(canonical);
  // Legacy keys stored with non-canonical exchange (CPH vs OMK)
  for (const [k, meta] of metadataByKey) {
    const pipe = k.indexOf("|");
    if (pipe < 0) continue;
    const t = k.slice(0, pipe);
    const ex = k.slice(pipe + 1);
    if (t === ticker.toUpperCase() && canonicalExchangeCode(ex) === canonicalExchangeCode(exchange)) {
      return meta;
    }
  }
  return undefined;
}

export function deriveHoldingsFromTransactions(
  transactions: Transaction[],
  metadataByKey: Map<string, HoldingMetadata>
): Holding[] {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date === b.date) return a.createdAt.localeCompare(b.createdAt);
    return a.date.localeCompare(b.date);
  });

  const aggregates = new Map<string, AggregateState>();

  for (const tx of sorted) {
    const ticker = normalizeHkYahooSymbol((tx.ticker || "").toUpperCase().trim());
    if (!ticker) continue;
    const exchange = canonicalExchangeCode(tx.exchange);
    const key = holdingKey(ticker, exchange);

    const meta = lookupMeta(metadataByKey, ticker, exchange);
    const isTradeType = tx.type === "buy" || tx.type === "sell";
    const current = aggregates.get(key) || {
      ticker,
      exchange,
      shares: 0,
      costAmount: 0,
      name: tx.name || meta?.name || ticker,
      displayCurrency: (isTradeType ? (tx.displayCurrency || tx.currency) : null) || meta?.displayCurrency || "EUR",
      isin: tx.isin || meta?.isin || "",
      assetType: tx.assetType || meta?.assetType || "stock",
      accountId: tx.accountId || meta?.accountId || "",
    };

    if (tx.type === "buy" && tx.shares > 0) {
      current.shares += tx.shares;
      current.costAmount += tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
    } else if (tx.type === "sell" && tx.shares > 0 && current.shares > 0) {
      const soldShares = Math.min(tx.shares, current.shares);
      const avgCost = current.shares > 0 ? current.costAmount / current.shares : 0;
      current.shares -= soldShares;
      current.costAmount = Math.max(0, current.costAmount - soldShares * avgCost);
    }

    if (tx.name) current.name = tx.name;
    if ((tx.type === "buy" || tx.type === "sell") && (tx.displayCurrency || tx.currency)) {
      current.displayCurrency = tx.displayCurrency || tx.currency;
    }
    if (tx.assetType) current.assetType = tx.assetType;
    if (tx.isin) current.isin = tx.isin;
    if (tx.accountId) current.accountId = tx.accountId;

    aggregates.set(key, current);
  }

  const derived: Holding[] = [];
  for (const [key, state] of aggregates.entries()) {
    if (state.shares <= 0) continue;
    const meta = lookupMeta(metadataByKey, state.ticker, state.exchange);
    derived.push({
      id: meta?.id || key,
      name: state.name,
      ticker: state.ticker,
      isin: state.isin,
      assetType: state.assetType,
      shares: state.shares,
      purchasePrice: state.shares > 0 ? state.costAmount / state.shares : 0,
      displayCurrency: state.displayCurrency,
      exchange: canonicalExchangeCode(state.exchange) || state.exchange,
      valueInEUR: 0,
      sector: meta?.sector || "",
      region: meta?.region || "",
      assetClass: meta?.assetClass || "",
      accountId: meta?.accountId || state.accountId || "",
      tags: meta?.tags?.length ? [...meta.tags] : undefined,
    });
  }

  return derived.sort((a, b) => a.name.localeCompare(b.name));
}
