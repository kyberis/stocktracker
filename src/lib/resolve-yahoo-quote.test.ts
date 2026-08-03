import { describe, expect, it, vi } from "vitest";
import { resolveYahooQuote } from "./resolve-yahoo-quote";
import type { YahooProvider } from "@/lib/api-providers/yahoo";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

vi.mock("@/lib/api-providers/isin-resolver", () => ({
  resolveIsinToTicker: async (_yahoo: unknown, symbol: string) => symbol,
}));

function quote(symbol: string, price = 10): ProviderQuoteResult {
  return {
    symbol,
    shortName: symbol,
    regularMarketPrice: price,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency: "EUR",
    regularMarketPreviousClose: price,
    fiftyTwoWeekHigh: price,
    fiftyTwoWeekLow: price,
    marketCap: 0,
  };
}

function mockYahoo(map: Record<string, ProviderQuoteResult | Error>): YahooProvider {
  return {
    getQuote: async (symbol: string) => {
      const hit = map[symbol.toUpperCase()] ?? map[symbol];
      if (!hit) throw new Error(`No quote data for ${symbol}`);
      if (hit instanceof Error) throw hit;
      return hit;
    },
  } as unknown as YahooProvider;
}

describe("resolveYahooQuote", () => {
  it("pads Hong Kong tickers before fetching", async () => {
    const yahoo = mockYahoo({ "0215.HK": quote("0215.HK", 22) });
    const q = await resolveYahooQuote(yahoo, "215.HK");
    expect(q?.regularMarketPrice).toBe(22);
    expect(q?.symbol).toBe("215.HK");
  });

  it("resolves bare news bases via aliases", async () => {
    const yahoo = mockYahoo({
      W9C: new Error("No quote data for W9C"),
      "W9C.DE": new Error("No quote data for W9C.DE"),
      "W9C.F": new Error("No quote data for W9C.F"),
      "CSU.TO": quote("CSU.TO", 3500),
    });
    const q = await resolveYahooQuote(yahoo, "W9C");
    expect(q?.regularMarketPrice).toBe(3500);
    expect(q?.symbol).toBe("W9C");
  });

  it("maps bare numeric HK bases to padded .HK", async () => {
    const yahoo = mockYahoo({
      "215": new Error("No quote data for 215"),
      "0215.HK": quote("0215.HK", 18),
    });
    const q = await resolveYahooQuote(yahoo, "215");
    expect(q?.regularMarketPrice).toBe(18);
    expect(q?.symbol).toBe("215");
  });

  it("returns null when nothing resolves", async () => {
    const yahoo = mockYahoo({});
    const q = await resolveYahooQuote(yahoo, "SILA");
    expect(q).toBeNull();
  });
});
