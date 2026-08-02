import { describe, expect, it } from "vitest";
import {
  buildHoldingClassificationUserPrompt,
  parseHoldingClassificationResponse,
} from "./ai-classify-holding";

describe("parseHoldingClassificationResponse", () => {
  it("parses clean JSON", () => {
    const result = parseHoldingClassificationResponse(
      JSON.stringify({
        sector: "Technology",
        region: "United States",
        assetClass: "Equity",
      }),
    );
    expect(result).toEqual({
      sector: "Technology",
      region: "United States",
      assetClass: "Equity",
    });
  });

  it("strips markdown fences and accepts asset_class alias", () => {
    const result = parseHoldingClassificationResponse(
      '```json\n{"sector":"Healthcare","region":"Europe","asset_class":"Equity"}\n```',
    );
    expect(result).toEqual({
      sector: "Healthcare",
      region: "Europe",
      assetClass: "Equity",
    });
  });

  it("falls back when one of sector/assetClass is missing", () => {
    expect(parseHoldingClassificationResponse('{"sector":"ETF","region":"Global"}')).toEqual({
      sector: "ETF",
      region: "Global",
      assetClass: "ETF",
    });
  });

  it("returns null for empty or invalid payloads", () => {
    expect(parseHoldingClassificationResponse("")).toBeNull();
    expect(parseHoldingClassificationResponse("not json")).toBeNull();
    expect(parseHoldingClassificationResponse('{"region":"US"}')).toBeNull();
  });
});

describe("buildHoldingClassificationUserPrompt", () => {
  it("includes provided fields", () => {
    const prompt = buildHoldingClassificationUserPrompt({
      ticker: "AAPL",
      name: "Apple Inc.",
      isin: "US0378331005",
      exchange: "NASDAQ",
      assetType: "stock",
    });
    expect(prompt).toContain("Ticker: AAPL");
    expect(prompt).toContain("Name: Apple Inc.");
    expect(prompt).toContain("ISIN: US0378331005");
    expect(prompt).toContain("Exchange: NASDAQ");
    expect(prompt).toContain("Asset type hint: stock");
  });
});
