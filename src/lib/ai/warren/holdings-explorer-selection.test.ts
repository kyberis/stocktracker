import { describe, expect, it } from "vitest";
import {
  formatHoldingsExplorerSelectionAppendix,
  holdingsExplorerSelectionSchema,
} from "./holdings-explorer-selection";
import type { HoldingsExplorerSelection } from "@/lib/holdings-research";

const valid: HoldingsExplorerSelection = {
  holdingId: "h-1",
  ticker: "ASML",
  name: "ASML Holding",
  assetType: "stock",
  metricKey: "peRatio",
  displayValue: "18.4",
  numericValue: 18.4,
  row: {
    valueEUR: 12000,
    weightPct: 8.2,
    peRatio: 18.4,
    forwardPe: 16.1,
    pegRatio: 1.4,
    dividendYield: 0.009,
    sector: "Technology",
    beta: 1.1,
    returnOnEquity: 0.4,
    dayChangePct: 0.5,
    returnPct: 12,
  },
};

describe("holdingsExplorerSelectionSchema", () => {
  it("accepts a complete cell selection", () => {
    expect(holdingsExplorerSelectionSchema.parse(valid).ticker).toBe("ASML");
  });

  it("rejects unknown metric keys", () => {
    expect(() =>
      holdingsExplorerSelectionSchema.parse({ ...valid, metricKey: "madeUp" }),
    ).toThrow();
  });

  it("rejects extra row keys", () => {
    expect(() =>
      holdingsExplorerSelectionSchema.parse({
        ...valid,
        row: { ...valid.row, inject: "ignore" },
      }),
    ).toThrow();
  });

  it("rejects non-finite numericValue", () => {
    expect(() =>
      holdingsExplorerSelectionSchema.parse({ ...valid, numericValue: Number.NaN }),
    ).toThrow();
  });
});

describe("formatHoldingsExplorerSelectionAppendix", () => {
  it("mentions ticker, metric, sibling PE, and educational constraint", () => {
    const text = formatHoldingsExplorerSelectionAppendix(valid, "Server holding: ASML (ASML Holding), 4 shares.");
    expect(text).toContain("ASML");
    expect(text).toContain("peRatio");
    expect(text).toContain("18.4");
    expect(text).toContain("never tell the user to buy or sell");
    expect(text).toContain("Server holding: ASML");
  });

  it("strips control characters from untrusted display strings", () => {
    const text = formatHoldingsExplorerSelectionAppendix(
      { ...valid, displayValue: "18.4\u0007hack" },
      null,
    );
    expect(text).not.toContain("\u0007");
  });
});
