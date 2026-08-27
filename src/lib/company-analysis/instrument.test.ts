import { describe, expect, it } from "vitest";
import { isEtfInstrument, isEtfQuoteType, isLegacyEquityCacheForEtf } from "./instrument";

describe("isEtfQuoteType", () => {
  it("treats Yahoo ETF and MUTUALFUND as funds", () => {
    expect(isEtfQuoteType("ETF")).toBe(true);
    expect(isEtfQuoteType("MUTUALFUND")).toBe(true);
    expect(isEtfQuoteType("EQUITY")).toBe(false);
  });
});

describe("isEtfInstrument", () => {
  it("detects CoinShares ETP by name when quoteType is missing", () => {
    expect(isEtfInstrument({ name: "CoinShares Physical Bitcoin" })).toBe(true);
  });

  it("detects UCITS ETF by name", () => {
    expect(isEtfInstrument({ name: "Vanguard FTSE All-World UCITS ETF" })).toBe(true);
  });

  it("does not flag ordinary companies", () => {
    expect(isEtfInstrument({ quoteType: "EQUITY", name: "Apple Inc." })).toBe(false);
  });
});

describe("isLegacyEquityCacheForEtf", () => {
  it("skips untagged fund caches so they rebuild under report:etf:", () => {
    expect(
      isLegacyEquityCacheForEtf({
        profile: { name: "CoinShares Physical Bitcoin ETP" },
      }),
    ).toBe(true);
  });

  it("keeps tagged equity and etf caches", () => {
    expect(
      isLegacyEquityCacheForEtf({
        instrumentKind: "equity",
        profile: { name: "CoinShares Physical Bitcoin ETP" },
      }),
    ).toBe(false);
    expect(
      isLegacyEquityCacheForEtf({
        instrumentKind: "etf",
        profile: { name: "CoinShares Physical Bitcoin ETP" },
      }),
    ).toBe(false);
  });
});
