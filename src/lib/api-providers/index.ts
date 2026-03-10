import type { NextRequest } from "next/server";
import type { StockDataProvider } from "./types";
import { YahooProvider } from "./yahoo";
import { AlphaVantageProvider } from "./alphavantage";
import { getGlobalAlphaVantageApiKey } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";

export type ApiProviderName = "yahoo" | "alphavantage";

export function createProvider(
  name: ApiProviderName,
  apiKey?: string
): StockDataProvider {
  switch (name) {
    case "alphavantage": {
      try {
        return new AlphaVantageProvider(apiKey || "");
      } catch (err) {
        console.warn(
          "Alpha Vantage provider initialization failed, falling back to Yahoo:",
          err instanceof Error ? err.message : err
        );
        return new YahooProvider();
      }
    }
    case "yahoo":
    default:
      return new YahooProvider();
  }
}

/**
 * Always returns Yahoo for basic market data (quotes, search, fundamentals,
 * overview, exchange rates). AV is reserved for premium-only endpoints
 * (intelligence, economic indicators, crypto history) via {@link getAlphaVantageFromRequest}.
 */
export async function getProviderFromRequest(_request: NextRequest): Promise<StockDataProvider> {
  return new YahooProvider();
}

/**
 * Returns an Alpha Vantage provider for Pro users when a global key is configured.
 * Used only by routes that need AV-exclusive data (intelligence, news sentiment, etc.).
 */
export async function getAlphaVantageFromRequest(
  request: NextRequest
): Promise<AlphaVantageProvider | null> {
  const session = await getSessionFromRequest(request);
  const avKey = getGlobalAlphaVantageApiKey();
  if (session?.plan !== "pro" || !avKey) return null;
  try {
    return new AlphaVantageProvider(avKey);
  } catch {
    return null;
  }
}

export type { StockDataProvider, CompanyOverview } from "./types";
