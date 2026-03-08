export type BrokerFormat =
  | "degiro"
  | "interactive_brokers"
  | "trading_212"
  | "revolut"
  | "simple";

export interface ExtractedTransaction {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  name: string;
  isin?: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  currency: string;
  sourceRef?: string;
}

export interface ExtractedHolding {
  name: string;
  ticker: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  assetType: "stock" | "etf";
}

export interface CashBalance {
  currency: string;
  amount: number;
}

export interface IbkrConnectionInfo {
  connected: boolean;
  queryId?: string;
  label?: string;
  lastSyncedAt?: string;
}
