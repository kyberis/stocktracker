export type BrokerFormat =
  | "degiro"
  | "interactive_brokers"
  | "trading_212"
  | "revolut"
  | "charles_schwab"
  | "fidelity"
  | "nordnet"
  | "tastytrade"
  | "freetrade"
  | "etoro"
  | "wealthsimple"
  | "questrade"
  | "firstrade"
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

export interface DisabledBrokerageConnection {
  id: string;
  brokerageName: string;
  disabledDate: string | null;
}

export interface SnapTradeConnectionInfo {
  connected: boolean;
  snapTradeUserId?: string;
  label?: string;
  lastSyncedAt?: string;
  disabledConnections?: DisabledBrokerageConnection[];
}
