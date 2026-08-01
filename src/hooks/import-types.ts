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
  | "myinvestor"
  | "simple";

export type ImportAssetType = "stock" | "etf" | "fund";

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
  assetType?: ImportAssetType;
  sourceRef?: string;
  brokerName?: string;
}

export interface ExtractedHolding {
  name: string;
  ticker: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  assetType: ImportAssetType;
  figiShareClass?: string;
}

export interface CashBalance {
  currency: string;
  amount: number;
  broker?: string;
}

export interface BrokerageConnection {
  id: string;
  brokerageName: string;
  disabled: boolean;
  disabledDate: string | null;
}

export interface DisabledBrokerageConnection {
  id: string;
  brokerageName: string;
  disabledDate: string | null;
}

export interface BrokerSyncInfo {
  brokerageAuthorizationId: string;
  brokerageName: string;
  lastImportedAt: string;
  connectedAt?: string;
  transactionCount?: number;
}

export interface SnapTradeConnectionInfo {
  connected: boolean;
  snapTradeUserId?: string;
  label?: string;
  lastSyncedAt?: string;
  disabledConnections?: DisabledBrokerageConnection[];
  brokerSyncs?: BrokerSyncInfo[];
  connectionLimit?: number;
}
