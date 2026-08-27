import { describe, expect, it } from "vitest";
import {
  analisisCryptoRedirectHref,
  cryptoBaseFromTicker,
  cryptoMarketHref,
  holdingDetailHref,
  isCryptoAssetRoute,
} from "./asset-detail-href";
import type { Holding } from "./types";

function holding(partial: Partial<Holding> & Pick<Holding, "ticker">): Holding {
  return {
    id: "h1",
    name: partial.name ?? partial.ticker,
    isin: "",
    shares: 1,
    purchasePrice: 1,
    displayCurrency: "USD",
    exchange: "",
    valueInEUR: 1,
    ...partial,
  };
}

describe("cryptoBaseFromTicker", () => {
  it("maps Yahoo pairs and spaced tickers to base", () => {
    expect(cryptoBaseFromTicker("BTC-USD")).toBe("BTC");
    expect(cryptoBaseFromTicker("btc usd")).toBe("BTC");
    expect(cryptoBaseFromTicker("ETH")).toBe("ETH");
  });
});

describe("isCryptoAssetRoute", () => {
  it("detects crypto quote pairs and CRYPTO exchange", () => {
    expect(isCryptoAssetRoute("BTC-USD")).toBe(true);
    expect(isCryptoAssetRoute("BTC", "CRYPTO")).toBe(true);
    expect(isCryptoAssetRoute("BTC", "CCC")).toBe(true);
    expect(isCryptoAssetRoute("BTC")).toBe(true);
  });

  it("does not treat equities as crypto", () => {
    expect(isCryptoAssetRoute("AAPL")).toBe(false);
    expect(isCryptoAssetRoute("AAPL", "NMS")).toBe(false);
    expect(isCryptoAssetRoute("UNKNOWN-USD")).toBe(false);
  });
});

describe("holdingDetailHref", () => {
  it("routes crypto holdings to /crypto", () => {
    expect(holdingDetailHref(holding({ ticker: "BTC-USD", assetType: "crypto", exchange: "CRYPTO" }))).toBe(
      "/crypto?symbol=BTC",
    );
  });

  it("routes stocks to /analisis", () => {
    expect(holdingDetailHref(holding({ ticker: "AAPL", exchange: "NMS" }))).toBe(
      "/analisis/AAPL?exchange=NMS",
    );
  });

  it("passes ISIN so namesake tickers keep the European listing", () => {
    expect(
      holdingDetailHref(
        holding({ ticker: "BITC", exchange: "ARCA", isin: "GB00BLD4ZL17" }),
      ),
    ).toBe("/analisis/BITC?exchange=ARCA&isin=GB00BLD4ZL17");
  });
});

describe("analisisCryptoRedirectHref", () => {
  it("redirects crypto analisis URLs", () => {
    expect(analisisCryptoRedirectHref("BTC-USD")).toBe("/crypto?symbol=BTC");
    expect(analisisCryptoRedirectHref("BTC", "CRYPTO")).toBe("/crypto?symbol=BTC");
    expect(analisisCryptoRedirectHref("AAPL")).toBeNull();
  });
});

describe("cryptoMarketHref", () => {
  it("returns null for unsupported bases", () => {
    expect(cryptoMarketHref("DOGECOIN")).toBeNull();
    expect(cryptoMarketHref("BTC")).toBe("/crypto?symbol=BTC");
  });
});
