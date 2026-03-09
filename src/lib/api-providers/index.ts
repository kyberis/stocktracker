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
 * Resolve provider based on user tier and AV key availability.
 * Pro users get Alpha Vantage when a global key is configured; everyone else gets Yahoo.
 */
export async function getProviderFromRequest(request: NextRequest): Promise<StockDataProvider> {
  const session = await getSessionFromRequest(request);
  const avKey = getGlobalAlphaVantageApiKey();
  const usePremium = session?.plan === "pro" && avKey.length > 0;
  return createProvider(usePremium ? "alphavantage" : "yahoo", avKey);
}

export type { StockDataProvider, CompanyOverview } from "./types";
