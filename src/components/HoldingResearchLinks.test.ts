import { describe, expect, it } from "vitest";
import {
  holdingSupportsAnalysis,
  holdingSupportsMoat,
} from "@/components/HoldingResearchLinks";
import type { Holding } from "@/lib/types";

function holding(partial: Partial<Holding>): Holding {
  return {
    id: "1",
    ticker: "AAPL",
    name: "Apple",
    shares: 1,
    purchasePrice: 100,
    purchaseDate: "2024-01-01",
    exchange: "NASDAQ",
    displayCurrency: "USD",
    valueInEUR: 100,
    assetType: "stock",
    ...partial,
  } as Holding;
}

describe("holding research eligibility", () => {
  it("allows analysis for stocks and ETFs, not cash/crypto", () => {
    expect(holdingSupportsAnalysis(holding({ assetType: "stock" }))).toBe(true);
    expect(holdingSupportsAnalysis(holding({ assetType: "etf" }))).toBe(true);
    expect(holdingSupportsAnalysis(holding({ assetType: "crypto" }))).toBe(false);
    expect(holdingSupportsAnalysis(holding({ exchange: "CASH", ticker: "CASH-EUR" }))).toBe(false);
  });

  it("allows moat only for stocks", () => {
    expect(holdingSupportsMoat(holding({ assetType: "stock" }))).toBe(true);
    expect(holdingSupportsMoat(holding({ assetType: "etf" }))).toBe(false);
    expect(holdingSupportsMoat(holding({ assetType: "crypto" }))).toBe(false);
    expect(holdingSupportsMoat(holding({ exchange: "CASH", ticker: "CASH-EUR" }))).toBe(false);
  });
});
