import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractedHolding } from "@/hooks/import-types";
import type { Holding } from "@/lib/types";
import { convertToEUR } from "@/lib/utils";

const {
  persistHoldingIsin,
  reenrichHoldingsValueInEUR,
  trackEvent,
  getRatesWithCache,
  search,
  getQuote,
} = vi.hoisted(() => ({
  persistHoldingIsin: vi.fn().mockResolvedValue(undefined),
  reenrichHoldingsValueInEUR: vi.fn().mockResolvedValue(undefined),
  trackEvent: vi.fn(),
  getRatesWithCache: vi.fn(),
  search: vi.fn(),
  getQuote: vi.fn(),
}));

vi.mock("@/lib/db/holdings", () => ({
  persistHoldingIsin,
  reenrichHoldingsValueInEUR,
}));

vi.mock("@/lib/db/analytics", () => ({
  trackEvent,
}));

vi.mock("@/lib/quote-cache", () => ({
  getRatesWithCache,
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({ search, getQuote })),
}));

import {
  collectNamesakeCandidateQuotes,
  isEuropeanYahooListing,
  pickNamesakeListing,
  remapNamesakesFromBrokerMarks,
  shouldPreserveListingAgainstFigiRename,
} from "./snaptrade-namesake-remap";

const RATES = { EURUSD: 1.166 };
const SHARES = 257;
const BROKER_USD = 65.45;
const US_USD = 34.85;
const COINSHARES_EUR = 64;

function brokerEUR(price = BROKER_USD): number {
  return convertToEUR(SHARES * price, "USD", RATES);
}

function usMarketEUR(price = US_USD): number {
  return convertToEUR(SHARES * price, "USD", RATES);
}

const bitcPos: ExtractedHolding = {
  name: "Bitwise Trendwise Bitcoin and Treasuries Rotation Strategy ETF",
  ticker: "BITC",
  shares: SHARES,
  purchasePrice: 40,
  displayCurrency: "USD",
  exchange: "ARCX",
  assetType: "etf",
  brokerPrice: BROKER_USD,
  figiShareClass: "BBG01FZQP6S8",
};

const bitcHolding: Holding = {
  id: "h-bitc",
  name: bitcPos.name,
  ticker: "BITC",
  isin: "",
  assetType: "etf",
  shares: SHARES,
  purchasePrice: 40,
  displayCurrency: "USD",
  exchange: "ARCX",
  valueInEUR: usMarketEUR(),
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  persistHoldingIsin.mockResolvedValue(undefined);
  reenrichHoldingsValueInEUR.mockImplementation(async (_userId: string, holdings: Holding[]) => {
    for (const h of holdings) {
      if (h.isin === "GB00BLD4ZL17") h.valueInEUR = SHARES * COINSHARES_EUR;
    }
  });
  getRatesWithCache.mockResolvedValue(RATES);
  search.mockResolvedValue([{ symbol: "GB00BLD4ZL17.SG" }, { symbol: "BITC" }]);
  getQuote.mockImplementation(async (symbol: string) => {
    const s = symbol.toUpperCase();
    if (s.startsWith("GB00") || s.endsWith(".SW") || s.endsWith(".DE") || s.endsWith(".SG")) {
      return { regularMarketPrice: COINSHARES_EUR, currency: "EUR" };
    }
    return { regularMarketPrice: US_USD, currency: "USD" };
  });
});

describe("isEuropeanYahooListing", () => {
  it("accepts venue suffixes and ISIN-shaped symbols", () => {
    expect(isEuropeanYahooListing("BITC.SW")).toBe(true);
    expect(isEuropeanYahooListing("GB00BLD4ZL17.SG")).toBe(true);
    expect(isEuropeanYahooListing("BITC")).toBe(false);
  });
});

describe("pickNamesakeListing", () => {
  it("picks the CoinShares ISIN listing for the production BITC fixture", () => {
    const pick = pickNamesakeListing({
      brokerValueEUR: brokerEUR(),
      marketValueEUR: usMarketEUR(),
      shares: SHARES,
      rates: RATES,
      candidates: [
        { symbol: "BITC.SW", price: 64.1, currency: "EUR" },
        { symbol: "GB00BLD4ZL17.SG", price: 63.9, currency: "EUR" },
        { symbol: "BITC", price: US_USD, currency: "USD" },
      ],
    });
    expect(pick).toEqual({ symbol: "GB00BLD4ZL17.SG", isin: "GB00BLD4ZL17" });
  });

  it("prefers an ISIN-shaped symbol over a closer venue suffix", () => {
    const pick = pickNamesakeListing({
      brokerValueEUR: brokerEUR(),
      marketValueEUR: usMarketEUR(),
      shares: SHARES,
      rates: RATES,
      candidates: [
        { symbol: "BITC.SW", price: 63.5, currency: "EUR" },
        { symbol: "GB00BLD4ZL17.SG", price: 66, currency: "EUR" },
      ],
    });
    expect(pick?.isin).toBe("GB00BLD4ZL17");
    expect(pick?.symbol).toBe("GB00BLD4ZL17.SG");
  });

  it("uses fallback ISIN when only a venue suffix matches", () => {
    const pick = pickNamesakeListing({
      brokerValueEUR: brokerEUR(),
      marketValueEUR: usMarketEUR(),
      shares: SHARES,
      rates: RATES,
      candidates: [{ symbol: "BITC.SW", price: COINSHARES_EUR, currency: "EUR" }],
      fallbackIsin: "GB00BLD4ZL17",
    });
    expect(pick).toEqual({ symbol: "BITC.SW", isin: "GB00BLD4ZL17" });
  });

  it("does not remap when the US last already matches the broker", () => {
    const aligned = brokerEUR();
    expect(
      pickNamesakeListing({
        brokerValueEUR: aligned,
        marketValueEUR: aligned * 1.02,
        shares: SHARES,
        rates: RATES,
        candidates: [{ symbol: "GB00BLD4ZL17.SG", price: COINSHARES_EUR, currency: "EUR" }],
      }),
    ).toBeNull();
  });

  it("does not remap when no European listing is close enough", () => {
    expect(
      pickNamesakeListing({
        brokerValueEUR: brokerEUR(),
        marketValueEUR: usMarketEUR(),
        shares: SHARES,
        rates: RATES,
        candidates: [{ symbol: "BITC.SW", price: US_USD, currency: "USD" }],
      }),
    ).toBeNull();
  });

  it("skips a foreign candidate when FX is missing", () => {
    expect(
      pickNamesakeListing({
        brokerValueEUR: brokerEUR(),
        marketValueEUR: usMarketEUR(),
        shares: SHARES,
        rates: RATES,
        candidates: [{ symbol: "BITC.SW", price: 55, currency: "CHF" }],
      }),
    ).toBeNull();
  });

  it("returns null for invalid size inputs", () => {
    expect(
      pickNamesakeListing({
        brokerValueEUR: brokerEUR(),
        marketValueEUR: usMarketEUR(),
        shares: 0,
        rates: RATES,
        candidates: [{ symbol: "GB00BLD4ZL17.SG", price: COINSHARES_EUR, currency: "EUR" }],
      }),
    ).toBeNull();
  });
});

describe("shouldPreserveListingAgainstFigiRename", () => {
  it("blocks unsuffixing a sticky non-US ISIN onto a US namesake ticker", () => {
    expect(
      shouldPreserveListingAgainstFigiRename({
        existingIsin: "GB00BLD4ZL17",
        incomingTicker: "BITC",
        incomingExchange: "ARCX",
      }),
    ).toBe(true);
    expect(
      shouldPreserveListingAgainstFigiRename({
        existingIsin: "",
        incomingTicker: "BITC",
        incomingExchange: "ARCX",
      }),
    ).toBe(false);
  });
});

describe("collectNamesakeCandidateQuotes", () => {
  it("dedupes search hits, suffixes, and the known ISIN listing", async () => {
    const yahoo = { search, getQuote };
    const quotes = await collectNamesakeCandidateQuotes(yahoo as never, "BITC");
    const symbols = quotes.map((q) => q.symbol);
    expect(symbols).toContain("GB00BLD4ZL17.SG");
    expect(symbols).toContain("BITC.SW");
    expect(symbols).not.toContain("BITC");
    expect(search).toHaveBeenCalledWith("BITC");
  });
});

describe("remapNamesakesFromBrokerMarks", () => {
  it("persists the CoinShares ISIN and re-enriches BITC", async () => {
    const holdings = [{ ...bitcHolding }];
    const out = await remapNamesakesFromBrokerMarks("u1", [bitcPos], holdings);
    expect(persistHoldingIsin).toHaveBeenCalledWith("u1", "h-bitc", "GB00BLD4ZL17");
    expect(reenrichHoldingsValueInEUR).toHaveBeenCalled();
    expect(out[0].isin).toBe("GB00BLD4ZL17");
    expect(trackEvent).toHaveBeenCalledWith(
      "u1",
      "snaptrade_namesake_remapped",
      expect.objectContaining({ ticker: "BITC", isin: "GB00BLD4ZL17" }),
    );
  });

  it("does not search AAPL when the mark gap is below thresholds", async () => {
    const pos: ExtractedHolding = {
      name: "Apple",
      ticker: "AAPL",
      shares: 1,
      purchasePrice: 100,
      displayCurrency: "EUR",
      exchange: "NASDAQ",
      assetType: "stock",
      brokerPrice: 100,
    };
    const holding: Holding = {
      ...bitcHolding,
      id: "h-aapl",
      ticker: "AAPL",
      name: "Apple",
      exchange: "NASDAQ",
      displayCurrency: "EUR",
      shares: 1,
      valueInEUR: 101,
    };
    await remapNamesakesFromBrokerMarks("u1", [pos], [holding]);
    expect(search).not.toHaveBeenCalled();
    expect(persistHoldingIsin).not.toHaveBeenCalled();
  });

  it("skips a holding that already has a non-US ISIN", async () => {
    await remapNamesakesFromBrokerMarks("u1", [bitcPos], [
      { ...bitcHolding, isin: "GB00BLD4ZL17" },
    ]);
    expect(search).not.toHaveBeenCalled();
    expect(persistHoldingIsin).not.toHaveBeenCalled();
  });

  it("does not search a suffixed European ticker", async () => {
    await remapNamesakesFromBrokerMarks("u1", [{ ...bitcPos, ticker: "BITC.DE" }], [
      { ...bitcHolding, ticker: "BITC.DE", exchange: "XET" },
    ]);
    expect(search).not.toHaveBeenCalled();
    expect(persistHoldingIsin).not.toHaveBeenCalled();
  });

  it("does not persist when Yahoo returns no European quotes", async () => {
    getQuote.mockResolvedValue({ regularMarketPrice: 0, currency: "EUR" });
    await remapNamesakesFromBrokerMarks("u1", [bitcPos], [{ ...bitcHolding }]);
    expect(persistHoldingIsin).not.toHaveBeenCalled();
  });

  it("does not persist when no candidate is close to the broker last", async () => {
    getQuote.mockResolvedValue({ regularMarketPrice: US_USD, currency: "USD" });
    await remapNamesakesFromBrokerMarks("u1", [bitcPos], [{ ...bitcHolding }]);
    expect(search).toHaveBeenCalled();
    expect(persistHoldingIsin).not.toHaveBeenCalled();
  });

  it("continues when persisting the ISIN fails", async () => {
    persistHoldingIsin.mockRejectedValueOnce(new Error("db down"));
    await remapNamesakesFromBrokerMarks("u1", [bitcPos], [{ ...bitcHolding }]);
    expect(reenrichHoldingsValueInEUR).not.toHaveBeenCalled();
  });

  it("does not throw when re-enrich fails after a successful remap", async () => {
    reenrichHoldingsValueInEUR.mockRejectedValueOnce(new Error("yahoo down"));
    const holdings = [{ ...bitcHolding }];
    await expect(remapNamesakesFromBrokerMarks("u1", [bitcPos], holdings)).resolves.toBe(holdings);
    expect(holdings[0].isin).toBe("GB00BLD4ZL17");
  });

  it("returns the same holdings when there is nothing to remap", async () => {
    const empty: Holding[] = [];
    await expect(remapNamesakesFromBrokerMarks("u1", [], empty)).resolves.toBe(empty);
  });
});

describe("collectNamesakeCandidateQuotes search failures", () => {
  it("still quotes suffix listings when search throws", async () => {
    search.mockRejectedValueOnce(new Error("search down"));
    const quotes = await collectNamesakeCandidateQuotes(
      { search, getQuote } as never,
      "BITC",
    );
    expect(quotes.some((q) => q.symbol === "BITC.SW")).toBe(true);
  });
});
