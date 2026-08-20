import { describe, expect, it } from "vitest";
import {
  augmentCryptoSearchWithEurPairs,
  queryWantsEurCryptoPair,
} from "@/lib/crypto-search-eur";
import type { ProviderSearchResult } from "@/lib/api-providers/types";

const solUsd: ProviderSearchResult = {
  symbol: "SOL-USD",
  shortname: "Solana USD",
  exchange: "CCC",
  quoteType: "CRYPTOCURRENCY",
};

describe("queryWantsEurCryptoPair", () => {
  it("detects EUR intent", () => {
    expect(queryWantsEurCryptoPair("SOL-EUR")).toBe(true);
    expect(queryWantsEurCryptoPair("sol eur")).toBe(true);
    expect(queryWantsEurCryptoPair("Solana EUR")).toBe(true);
  });

  it("is false for USD-only queries", () => {
    expect(queryWantsEurCryptoPair("solana")).toBe(false);
    expect(queryWantsEurCryptoPair("SOL-USD")).toBe(false);
  });
});

describe("augmentCryptoSearchWithEurPairs", () => {
  it("adds SOL-EUR when Yahoo only returned SOL-USD", () => {
    const out = augmentCryptoSearchWithEurPairs([solUsd], "solana");
    expect(out.map((r) => r.symbol)).toEqual(["SOL-USD", "SOL-EUR"]);
  });

  it("puts SOL-EUR first when the query asks for EUR", () => {
    const out = augmentCryptoSearchWithEurPairs([solUsd], "SOL-EUR");
    expect(out[0]?.symbol).toBe("SOL-EUR");
    expect(out.some((r) => r.symbol === "SOL-USD")).toBe(true);
  });

  it("does not duplicate an existing EUR pair", () => {
    const eur: ProviderSearchResult = {
      symbol: "SOL-EUR",
      shortname: "Solana EUR",
      exchange: "CCC",
      quoteType: "CRYPTOCURRENCY",
    };
    const out = augmentCryptoSearchWithEurPairs([solUsd, eur], "solana");
    expect(out.filter((r) => r.symbol === "SOL-EUR")).toHaveLength(1);
  });

  it("synthesizes SOL-EUR when Yahoo returns no hits for a direct EUR ticker", () => {
    const out = augmentCryptoSearchWithEurPairs([], "SOL-EUR");
    expect(out).toEqual([
      {
        symbol: "SOL-EUR",
        shortname: "SOL",
        exchange: "CCC",
        quoteType: "CRYPTOCURRENCY",
      },
    ]);
  });

  it("ignores non-crypto results", () => {
    const equity: ProviderSearchResult = {
      symbol: "SOLE",
      shortname: "Soliton",
      exchange: "NMS",
      quoteType: "EQUITY",
    };
    const out = augmentCryptoSearchWithEurPairs([equity], "sole");
    expect(out).toEqual([equity]);
  });
});
