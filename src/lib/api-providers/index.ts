import type { StockDataProvider } from "./types";
import { YahooProvider } from "./yahoo";
import { AlphaVantageProvider } from "./alphavantage";

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

export function getProviderFromRequest(request: Request): StockDataProvider {
  const { searchParams } = new URL(request.url);
  const rawProviderName = searchParams.get("provider");
  const providerName: ApiProviderName =
    rawProviderName === "alphavantage" ? "alphavantage" : "yahoo";
  const apiKey = request.headers.get("x-api-key") || searchParams.get("apiKey") || "";
  return createProvider(providerName, apiKey);
}

export type { StockDataProvider, CompanyOverview } from "./types";
