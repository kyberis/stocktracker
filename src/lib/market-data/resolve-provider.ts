import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
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

export type MarketDataBackend = "fmp";
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
 * Resolves FMP for premium routes (moat, intelligence, search, etc.).
 * Returns null when FMP_API_KEY is missing or the surface FMP flag is off.
 */
export async function resolvePremiumStockDataProvider(
  userId: string | null,
  surface: MarketDataSurface
): Promise<{ provider: StockDataProvider; backend: MarketDataBackend } | null> {
  const useFmp = await shouldUseFmpForSurface(userId, surface);
  const fmpKey = getGlobalFmpApiKey();
  if (!useFmp || !fmpKey) return null;
  try {
    return { provider: new FmpMarketDataProvider(fmpKey), backend: "fmp" };
  } catch {
    return null;
  }
}

/**
 * Fundamentals API: FMP when configured, otherwise Yahoo (no Alpha Vantage).
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
 * Pro-only: returns FMP for routes that previously used Alpha Vantage.
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
