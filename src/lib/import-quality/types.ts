export type ImportQualitySeverity = "info" | "warn" | "error";

export type ImportQualityCode =
  | "missing_fx"
  | "currency_mismatch"
  | "unit_magnitude"
  | "unresolved_ticker"
  | "recent_trade_price"
  | "missing_quote"
  | "stale_value_in_eur"
  | "hk_ticker_padding";

export type ImportQualityFixAction =
  | "fetch_fx"
  | "align_display_currency"
  | "normalize_gbx"
  | "pad_hk_ticker"
  | "recompute_value_in_eur"
  | "set_price_per_share"
  | "none";

export interface ImportQualityFinding {
  id: string;
  severity: ImportQualitySeverity;
  code: ImportQualityCode;
  ticker?: string;
  isin?: string;
  message: string;
  evidence: Record<string, unknown>;
  /** Safe to apply without user confirmation */
  autoFixable: boolean;
  fixAction: ImportQualityFixAction;
  /** Populated after a repair pass */
  fixed?: boolean;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ImportQualityReport {
  findings: ImportQualityFinding[];
  fixedCount: number;
  needsReviewCount: number;
  aiSummary?: string | null;
}

export interface MarketQuoteRef {
  price: number;
  currency: string;
}

export interface AuditTransactionInput {
  date: string;
  type: string;
  ticker: string;
  name?: string;
  isin?: string;
  shares: number;
  pricePerShare: number;
  currency: string;
}

export interface AuditHoldingInput {
  id?: string;
  ticker: string;
  name?: string;
  isin?: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange?: string;
  valueInEUR?: number;
}
