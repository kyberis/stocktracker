import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import type { StockDataProvider } from "@/lib/api-providers/types";
import {
  getGlobalAlphaVantageApiKey,
  getGlobalFmpApiKey,
  hasPremiumMarketDataConfigured,
  isFeatureEnabled,
  isFeatureEnabledForUser,
} from "@/lib/db";
import type { MarketDataSurface } from "./surface";
import { MARKET_DATA_SURFACE_FLAG } from "./surface-flags";

export type MarketDataBackend = "fmp" | "alphavantage";

export async function shouldUseFmpForSurface(
  userId: string | null,
  surface: MarketDataSurface
): Promise<boolean> {
  const flag = MARKET_DATA_SURFACE_FLAG[surface];
  if (!userId) {
    return isFeatureEnabled(flag);
  }
  return isFeatureEnabledForUser(flag, userId);
}

/**
 * Resolves the stock data provider for premium routes. When the FMP flag is on
 * and `FMP_API_KEY` is set, uses FMP; otherwise falls back to Alpha Vantage
 * when `STOCKTRACKER_ALPHAVANTAGE_API_KEY` is set.
 */
export async function resolvePremiumStockDataProvider(
  userId: string | null,
  surface: MarketDataSurface
): Promise<{ provider: StockDataProvider; backend: MarketDataBackend } | null> {
  const useFmp = await shouldUseFmpForSurface(userId, surface);
  const fmpKey = getGlobalFmpApiKey();
  const avKey = getGlobalAlphaVantageApiKey();

  if (useFmp && fmpKey) {
    try {
      return { provider: new FmpMarketDataProvider(fmpKey), backend: "fmp" };
    } catch {
      /* fall through */
    }
  }
  if (avKey) {
    try {
      return { provider: new AlphaVantageProvider(avKey), backend: "alphavantage" };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Pro-only: returns a market data provider for routes that previously used
 * {@link getAlphaVantageFromRequest}. Respects FMP rollout flags per surface.
 */
export async function getPremiumMarketDataFromRequest(
  request: NextRequest,
  surface: MarketDataSurface
): Promise<{ provider: StockDataProvider; backend: MarketDataBackend } | null> {
  const session = await getSessionFromRequest(request);
  if (session?.plan !== "pro") return null;
  if (!hasPremiumMarketDataConfigured()) return null;
  return resolvePremiumStockDataProvider(session.userId, surface);
}
