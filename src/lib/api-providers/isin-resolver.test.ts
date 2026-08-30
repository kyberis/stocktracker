import { describe, expect, it } from "vitest";
import { pickYahooSymbolForIsin } from "./isin-resolver";

describe("pickYahooSymbolForIsin", () => {
  it("never picks an ISIN-prefixed venue symbol", () => {
    expect(
      pickYahooSymbolForIsin("GB00BLD4ZL17", [
        { symbol: "GB00BLD4ZL17.SG" },
        { symbol: "BITC.SW" },
      ]),
    ).toBe("BITC.SW");
  });

  it("prefers a European suffix over a bare US ticker, then first usable", () => {
    expect(
      pickYahooSymbolForIsin("GB00BLD4ZL17", [{ symbol: "BITC.SW" }, { symbol: "BITC" }]),
    ).toBe("BITC.SW");
    expect(pickYahooSymbolForIsin("US0378331005", [{ symbol: "AAPL" }])).toBe("AAPL");
    expect(
      pickYahooSymbolForIsin("GB00BLD4ZL17", [{ symbol: "GB00BLD4ZL17.SG" }]),
    ).toBeNull();
  });
});
