import { describe, expect, it } from "vitest";
import { trading212Parser } from "../trading-212";
import { readFileSync } from "fs";
import { join } from "path";

const SAMPLE_CSV = readFileSync(
  join(__dirname, "../../../../docs/portfolio_sample_trading212.csv"),
  "utf-8",
);

describe("trading212Parser", () => {
  it("has correct metadata", () => {
    expect(trading212Parser.id).toBe("trading_212");
    expect(trading212Parser.label).toBe("Trading 212");
  });

  it("parses buy transactions (Market buy and Limit buy)", () => {
    const txs = trading212Parser.parse(SAMPLE_CSV, {});
    const buys = txs.filter((t) => t.type === "buy");
    expect(buys.length).toBe(3);

    const aaplBuy = buys.find((t) => t.ticker === "AAPL");
    expect(aaplBuy).toBeDefined();
    expect(aaplBuy!.shares).toBe(10);
    expect(aaplBuy!.pricePerShare).toBe(150.50);
    expect(aaplBuy!.date).toBe("2024-01-15");
    expect(aaplBuy!.isin).toBe("US0378331005");

    const limitBuy = buys.find((t) => t.ticker === "MSFT");
    expect(limitBuy).toBeDefined();
    expect(limitBuy!.fees).toBe(1.50);
  });

  it("parses sell transactions", () => {
    const txs = trading212Parser.parse(SAMPLE_CSV, {});
    const sells = txs.filter((t) => t.type === "sell");
    expect(sells.length).toBe(1);
    expect(sells[0].ticker).toBe("AAPL");
    expect(sells[0].shares).toBe(5);
    expect(sells[0].pricePerShare).toBe(175.25);
    expect(sells[0].date).toBe("2024-03-20");
  });

  it("parses dividend transactions with withholding tax", () => {
    const txs = trading212Parser.parse(SAMPLE_CSV, {});
    const divs = txs.filter((t) => t.type === "dividend");
    expect(divs.length).toBe(2);

    const aaplDiv = divs.find((t) => t.ticker === "AAPL");
    expect(aaplDiv).toBeDefined();
    expect(aaplDiv!.taxes).toBe(0.36);

    const msftDiv = divs.find((t) => t.ticker === "MSFT");
    expect(msftDiv).toBeDefined();
    expect(msftDiv!.taxes).toBe(0.34);
  });

  it("skips Deposit rows", () => {
    const txs = trading212Parser.parse(SAMPLE_CSV, {});
    const deposits = txs.filter((t) => t.name?.includes("Deposit") || false);
    // Deposit rows have no ticker and detectType returns null
    expect(deposits.length).toBe(0);
  });

  it("uses ID for sourceRef when available", () => {
    const txs = trading212Parser.parse(SAMPLE_CSV, {});
    const aaplBuy = txs.find((t) => t.ticker === "AAPL" && t.type === "buy");
    expect(aaplBuy!.sourceRef).toBe("trading212|abc-001");
  });

  it("extracts ISINs", () => {
    const isins = trading212Parser.extractIsins!(SAMPLE_CSV);
    expect(isins).toContain("US0378331005");
    expect(isins).toContain("IE00B5BMR087");
    expect(isins).toContain("US5949181045");
  });

  it("handles variable fee columns (2022+ minimal format)", () => {
    const csv = [
      "Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result (GBP),Total (GBP),Charge amount (GBP),Stamp duty reserve tax (GBP),Notes,ID",
      "Market buy,2024-01-15 10:30:00,US0378331005,AAPL,Apple Inc,10,150.50,USD,0.79,,1189.00,2.50,1.00,,buy-001",
    ].join("\n");

    const txs = trading212Parser.parse(csv, {});
    expect(txs.length).toBe(1);
    expect(txs[0].fees).toBe(3.50); // charge amount + stamp duty
    expect(txs[0].taxes).toBe(0); // no withholding tax column
  });

  it("returns empty for empty CSV", () => {
    expect(trading212Parser.parse("", {})).toEqual([]);
    expect(trading212Parser.parse("Action\n", {})).toEqual([]);
  });
});
