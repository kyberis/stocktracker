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
}

function holdingKey(ticker: string, exchange: string): string {
  return `${ticker.toUpperCase()}|${exchange.toUpperCase()}`;
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
    const ticker = (tx.ticker || "").toUpperCase().trim();
    if (!ticker) continue;
    const exchange = (tx.exchange || "").toUpperCase().trim();
    const key = holdingKey(ticker, exchange);

    const meta = metadataByKey.get(key);
    const current = aggregates.get(key) || {
      ticker,
      exchange,
      shares: 0,
      costAmount: 0,
      name: tx.name || meta?.name || ticker,
      displayCurrency: tx.displayCurrency || tx.currency || meta?.displayCurrency || "EUR",
      isin: tx.isin || meta?.isin || "",
      assetType: tx.assetType || meta?.assetType || "stock",
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
    if (tx.displayCurrency || tx.currency) current.displayCurrency = tx.displayCurrency || tx.currency;
    if (tx.assetType) current.assetType = tx.assetType;
    if (tx.isin) current.isin = tx.isin;

    aggregates.set(key, current);
  }

  const derived: Holding[] = [];
  for (const [key, state] of aggregates.entries()) {
    if (state.shares <= 0) continue;
    const meta = metadataByKey.get(key);
    derived.push({
      id: meta?.id || key,
      name: state.name,
      ticker: state.ticker,
      isin: state.isin,
      assetType: state.assetType,
      shares: state.shares,
      purchasePrice: state.shares > 0 ? state.costAmount / state.shares : 0,
      displayCurrency: state.displayCurrency,
      exchange: state.exchange,
      valueInEUR: 0,
      sector: meta?.sector || "",
      region: meta?.region || "",
      assetClass: meta?.assetClass || "",
      accountId: meta?.accountId || "",
    });
  }

  return derived.sort((a, b) => a.name.localeCompare(b.name));
}
