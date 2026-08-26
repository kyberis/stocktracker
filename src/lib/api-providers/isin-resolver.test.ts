import { describe, expect, it } from "vitest";
import { pickYahooSymbolForIsin } from "./isin-resolver";

describe("pickYahooSymbolForIsin", () => {
  it("prefers an ISIN-suffixed venue over a same-ticker US ETF", () => {
    expect(
      pickYahooSymbolForIsin("GB00BLD4ZL17", [
        { symbol: "BITC.SW" },
        { symbol: "GB00BLD4ZL17.SG" },
      ]),
    ).toBe("GB00BLD4ZL17.SG");
  });

  it("falls back to a European suffix, then the first result", () => {
    expect(
      pickYahooSymbolForIsin("GB00BLD4ZL17", [{ symbol: "BITC.SW" }, { symbol: "BITC" }]),
    ).toBe("BITC.SW");
    expect(pickYahooSymbolForIsin("US0378331005", [{ symbol: "AAPL" }])).toBe("AAPL");
  });
});
