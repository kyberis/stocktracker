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
 * Resolves the stock data provider for premium routes. When `market_data_alpha_vantage`
 * is off, only FMP is used (all surfaces). When on: uses FMP if the surface FMP flag
 * is on and `FMP_API_KEY` is set; otherwise falls back to Alpha Vantage when configured.
 */
export async function resolvePremiumStockDataProvider(
  userId: string | null,
  surface: MarketDataSurface
): Promise<{ provider: StockDataProvider; backend: MarketDataBackend } | null> {
  const avAllowed = await isFeatureEnabled("market_data_alpha_vantage");
  /** When AV is disabled, every premium surface uses FMP only (no per-surface FMP flags required). */
  const useFmp = !avAllowed || (await shouldUseFmpForSurface(userId, surface));
  const fmpKey = getGlobalFmpApiKey();
  const avKey = getGlobalAlphaVantageApiKey();

  if (useFmp && fmpKey) {
    try {
      return { provider: new FmpMarketDataProvider(fmpKey), backend: "fmp" };
    } catch {
      /* fall through */
    }
  }
  if (avAllowed && avKey) {
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
  if (!(await hasPremiumMarketDataConfigured())) return null;
  return resolvePremiumStockDataProvider(session.userId, surface);
}
