import { describe, expect, it } from "vitest";
import { assetTypeFromQuoteType, inferAssetType } from "./infer-asset-type";

describe("assetTypeFromQuoteType", () => {
  it("maps Yahoo quote types", () => {
    expect(assetTypeFromQuoteType("MUTUALFUND")).toBe("fund");
    expect(assetTypeFromQuoteType("ETF")).toBe("etf");
    expect(assetTypeFromQuoteType("CRYPTOCURRENCY")).toBe("crypto");
    expect(assetTypeFromQuoteType("EQUITY")).toBe("stock");
    expect(assetTypeFromQuoteType("")).toBeNull();
    expect(assetTypeFromQuoteType(null)).toBeNull();
  });
});

describe("inferAssetType", () => {
  it("prefers quote type over text heuristics", () => {
    expect(inferAssetType({ quoteType: "MUTUALFUND", name: "Some ETF" })).toBe("fund");
    expect(inferAssetType({ quoteType: "ETF", name: "Mutual Fund XYZ" })).toBe("etf");
  });

  it("classifies ETF-like names", () => {
    expect(inferAssetType({ name: "iShares Core MSCI World UCITS ETF" })).toBe("etf");
    expect(inferAssetType({ name: "Vanguard Index Fund" })).toBe("etf");
  });

  it("classifies mutual fund / SICAV / fondo labels", () => {
    expect(inferAssetType({ name: "Fidelity Global Technology Mutual Fund" })).toBe("fund");
    expect(inferAssetType({ name: "Bestinver Bolsa FI" })).toBe("fund");
    expect(inferAssetType({ name: "MyInvestor Fondo Indexado" })).toBe("fund");
    expect(inferAssetType({ name: "Amundi SICAV Euro Bond" })).toBe("fund");
  });

  it("uses broker type hints", () => {
    expect(inferAssetType({ brokerType: "etf", name: "Unknown" })).toBe("etf");
    expect(inferAssetType({ brokerType: "mutual fund", name: "Unknown" })).toBe("fund");
    expect(inferAssetType({ brokerType: "cryptocurrency", name: "BTC" })).toBe("crypto");
    expect(inferAssetType({ brokerType: "stock", name: "Apple Inc" })).toBe("stock");
  });

  it("defaults to stock", () => {
    expect(inferAssetType({ name: "Apple Inc" })).toBe("stock");
    expect(inferAssetType("Plain Company Name")).toBe("stock");
  });
});
