import { describe, expect, it } from "vitest";
import { tradeRepublicParser } from "../trade-republic";
import { detectBrokerFormat } from "../index";

const SAMPLE_CSV = [
  "Date,Type,Ticker,ISIN,Shares,Price,Amount,Currency,Fee,Tax",
  "2024-01-15,Buy,AAPL,US0378331005,10,185.50,-1855.00,USD,1.00,",
  "2024-03-10,Dividend,AAPL,US0378331005,10,,2.40,USD,,0.36",
  "2024-06-20,Sell,AAPL,US0378331005,5,210.30,1051.50,USD,1.00,",
  "2024-07-01,Savings Plan,VWCE,IE00BK5BQT80,0.42,118.20,-49.64,EUR,0,",
  "2024-08-01,Interest,,,,1.20,EUR,,",
].join("\n");

const DE_CSV = [
  "Datum;Typ;Ticker;ISIN;Anteile;Preis;Betrag;Währung;Gebühr;Steuer",
  "15.01.2024;Kauf;AAPL;US0378331005;2,5;150,00;-375,00;EUR;1,00;",
].join("\n");

describe("tradeRepublicParser", () => {
  it("has correct metadata", () => {
    expect(tradeRepublicParser.id).toBe("trade_republic");
    expect(tradeRepublicParser.label).toBe("Trade Republic");
  });

  it("detects English Transaction Report headers", () => {
    expect(tradeRepublicParser.detect(SAMPLE_CSV)).toBe(true);
    expect(detectBrokerFormat(SAMPLE_CSV)).toBe("trade_republic");
  });

  it("detects German semicolon headers", () => {
    expect(tradeRepublicParser.detect(DE_CSV)).toBe(true);
  });

  it("parses German decimal amounts and dates", () => {
    const txs = tradeRepublicParser.parse(DE_CSV, {});
    expect(txs).toHaveLength(1);
    expect(txs[0].date).toBe("2024-01-15");
    expect(txs[0].shares).toBe(2.5);
    expect(txs[0].pricePerShare).toBe(150);
    expect(txs[0].fees).toBe(1);
  });

  it("does not detect unrelated CSVs", () => {
    expect(tradeRepublicParser.detect("Action,Time,ISIN,Ticker\nbuy,x,y,z")).toBe(false);
  });

  it("parses buys, sells, dividends, and savings plans", () => {
    const txs = tradeRepublicParser.parse(SAMPLE_CSV, {});
    expect(txs.filter((t) => t.type === "buy").length).toBe(2);
    expect(txs.filter((t) => t.type === "sell").length).toBe(1);
    expect(txs.filter((t) => t.type === "dividend").length).toBe(1);

    const buy = txs.find((t) => t.type === "buy" && t.ticker === "AAPL");
    expect(buy).toBeDefined();
    expect(buy!.shares).toBe(10);
    expect(buy!.pricePerShare).toBe(185.5);
    expect(buy!.fees).toBe(1);
    expect(buy!.date).toBe("2024-01-15");
    expect(buy!.isin).toBe("US0378331005");

    const sell = txs.find((t) => t.type === "sell");
    expect(sell!.shares).toBe(5);
    expect(sell!.pricePerShare).toBe(210.3);

    const div = txs.find((t) => t.type === "dividend");
    expect(div!.taxes).toBe(0.36);
    expect(div!.shares).toBe(0);

    const sparplan = txs.find((t) => t.ticker === "VWCE");
    expect(sparplan!.type).toBe("buy");
    expect(sparplan!.shares).toBe(0.42);
  });

  it("skips interest rows", () => {
    const txs = tradeRepublicParser.parse(SAMPLE_CSV, {});
    expect(txs.every((t) => t.ticker !== "")).toBe(true);
    expect(txs.some((t) => t.type === "buy" && t.totalAmount === 1.2)).toBe(false);
  });

  it("resolves ticker from ISIN map when ticker is blank", () => {
    const csv = [
      "Date,Type,Ticker,ISIN,Shares,Price,Amount,Currency,Fee,Tax",
      "2024-01-15,Buy,,US0378331005,1,100,100,EUR,,",
    ].join("\n");
    const txs = tradeRepublicParser.parse(csv, { US0378331005: "AAPL" });
    expect(txs[0].ticker).toBe("AAPL");
  });

  it("extracts ISINs", () => {
    const isins = tradeRepublicParser.extractIsins!(SAMPLE_CSV);
    expect(isins).toContain("US0378331005");
    expect(isins).toContain("IE00BK5BQT80");
  });
});
