import { describe, expect, it } from "vitest";
import {
  toTradingViewChartUrl,
  toTradingViewLocale,
  toTradingViewSymbol,
} from "./tradingview";

describe("toTradingViewSymbol", () => {
  it("maps NYSE ServiceNow like the HTML template", () => {
    expect(toTradingViewSymbol("NOW", "NYSE")).toBe("NYSE:NOW");
  });

  it("maps NASDAQ aliases", () => {
    expect(toTradingViewSymbol("AAPL", "NMS")).toBe("NASDAQ:AAPL");
    expect(toTradingViewSymbol("MSFT", "NASDAQ")).toBe("NASDAQ:MSFT");
  });

  it("falls back to bare ticker when exchange unknown", () => {
    expect(toTradingViewSymbol("NOW", "")).toBe("NOW");
  });
});

describe("toTradingViewChartUrl", () => {
  it("builds the public symbols URL", () => {
    expect(toTradingViewChartUrl("NOW", "NYSE")).toBe(
      "https://www.tradingview.com/symbols/NYSE-NOW/",
    );
  });
});

describe("toTradingViewLocale", () => {
  it("maps nb to no and unknown to en", () => {
    expect(toTradingViewLocale("es")).toBe("es");
    expect(toTradingViewLocale("nb")).toBe("no");
    expect(toTradingViewLocale("xx")).toBe("en");
  });
});
