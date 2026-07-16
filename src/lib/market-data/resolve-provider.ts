import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { FreePremiumProvider, isFreePremiumStackAvailable } from "@/lib/api-providers/free-premium";
import { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { StockDataProvider } from "@/lib/api-providers/types";
import {
  getGlobalFmpApiKey,
  hasPremiumMarketDataConfigured,
  isFeatureEnabled,
  isFeatureEnabledForUser,
} from "@/lib/db";
import type { MarketDataSurface } from "./surface";
import { MARKET_DATA_SURFACE_FLAG } from "./surface-flags";

export type MarketDataBackend = "free" | "fmp" | "yahoo";
export type FundamentalsDataBackend = "fmp" | "yahoo";

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
 * Resolves premium market data for Pro surfaces.
 * Default: free stack (Yahoo + Finnhub + FRED + CoinGecko).
 * Optional: FMP when `FMP_API_KEY` is set and the surface FMP flag is on.
 */
export async function resolvePremiumStockDataProvider(
  userId: string | null,
  surface: MarketDataSurface
): Promise<{ provider: StockDataProvider; backend: MarketDataBackend } | null> {
  const useFmp = await shouldUseFmpForSurface(userId, surface);
  const fmpKey = getGlobalFmpApiKey();
  if (useFmp && fmpKey) {
    try {
      return { provider: new FmpMarketDataProvider(fmpKey), backend: "fmp" };
    } catch {
      /* fall through to free stack */
    }
  }

  if (!isFreePremiumStackAvailable()) return null;
  return { provider: new FreePremiumProvider(), backend: "free" };
}

/**
 * Fundamentals API: FMP only when flag + key; otherwise Yahoo (free primary).
 */
export async function resolveFundamentalsProvider(
  userId: string | null
): Promise<{ provider: StockDataProvider; backend: FundamentalsDataBackend }> {
  const fmpKey = getGlobalFmpApiKey();
  const useFmp = await shouldUseFmpForSurface(userId, "fundamentals");
  if (useFmp && fmpKey) {
    try {
      return { provider: new FmpMarketDataProvider(fmpKey), backend: "fmp" };
    } catch {
      /* fall through to Yahoo */
    }
  }
  return { provider: new YahooProvider(), backend: "yahoo" };
}

/**
 * Pro-only: returns free premium (or FMP when flagged) for routes that need rich market data.
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
