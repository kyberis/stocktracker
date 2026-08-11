export interface ParsedTransaction {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee";
  ticker: string;
  name: string;
  isin: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  taxes: number;
  currency: string;
  exchangeRateEur?: number;
  orderId: string;
  sourceRef: string;
}

export interface CashBalance {
  currency: string;
  amount: number;
}

export interface BrokerParser {
  id: string;
  label: string;
  fileHint: string;
  /** True if `csv` looks like this broker's export format — used for auto-detection. */
  detect(csv: string): boolean;
  parse(csv: string, isinToTicker: Record<string, string>): ParsedTransaction[];
  parseCashBalances?(csv: string): CashBalance[];
  extractIsins?(csv: string): string[];
}
