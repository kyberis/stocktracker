/**
 * Internal surfaces used to pick free premium vs optional FMP override (feature-flag rollout).
 * Not exposed to the client.
 */
export type MarketDataSurface =
  | "search"
  | "fundamentals"
  | "intelligence"
  | "portfolio_news"
  | "economic_indicators"
  | "crypto"
  | "dividends"
  | "moat_sync"
  | "event_sync_earnings";
