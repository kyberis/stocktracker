import type { PlatformFeature } from "@/lib/db/settings";
import type { MarketDataSurface } from "./surface";

/** Maps each surface to its optional FMP override flag (default off → free stack). */
export const MARKET_DATA_SURFACE_FLAG: Record<MarketDataSurface, PlatformFeature> = {
  search: "market_data_fmp_search",
  fundamentals: "market_data_fmp_fundamentals",
  intelligence: "market_data_fmp_intelligence",
  portfolio_news: "market_data_fmp_portfolio_news",
  economic_indicators: "market_data_fmp_economic_indicators",
  crypto: "market_data_fmp_crypto",
  dividends: "market_data_fmp_dividends",
  moat_sync: "market_data_fmp_fundamentals",
  event_sync_earnings: "market_data_fmp_event_sync",
};
