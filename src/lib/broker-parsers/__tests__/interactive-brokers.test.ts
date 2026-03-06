import { describe, expect, it } from "vitest";
import { ibkrParser } from "../interactive-brokers";
import { readFileSync } from "fs";
import { join } from "path";

const SAMPLE_CSV = readFileSync(
  join(__dirname, "../../../../docs/portfolio_sample_ibkr.csv"),
  "utf-8",
);

describe("ibkrParser", () => {
  it("has correct metadata", () => {
    expect(ibkrParser.id).toBe("interactive_brokers");
    expect(ibkrParser.label).toBe("Interactive Brokers");
  });

  it("parses buy transactions", () => {
    const txs = ibkrParser.parse(SAMPLE_CSV, {});
    const buys = txs.filter((t) => t.type === "buy");
    expect(buys.length).toBe(3);

    const aaplBuy = buys.find((t) => t.ticker === "AAPL");
    expect(aaplBuy).toBeDefined();
    expect(aaplBuy!.shares).toBe(100);
    expect(aaplBuy!.pricePerShare).toBe(150.50);
    expect(aaplBuy!.totalAmount).toBe(15050);
    expect(aaplBuy!.fees).toBe(1);
    expect(aaplBuy!.currency).toBe("USD");
    expect(aaplBuy!.date).toBe("2024-01-15");
  });

  it("parses sell transactions", () => {
    const txs = ibkrParser.parse(SAMPLE_CSV, {});
    const sells = txs.filter((t) => t.type === "sell");
    expect(sells.length).toBe(1);

    const aaplSell = sells[0];
    expect(aaplSell.ticker).toBe("AAPL");
    expect(aaplSell.shares).toBe(50);
    expect(aaplSell.pricePerShare).toBe(175.25);
    expect(aaplSell.totalAmount).toBe(8762.50);
    expect(aaplSell.date).toBe("2024-03-20");
  });

  it("parses dividend transactions with withholding tax", () => {
    const txs = ibkrParser.parse(SAMPLE_CSV, {});
    const divs = txs.filter((t) => t.type === "dividend");
    expect(divs.length).toBe(2);

    const aaplDiv = divs.find((t) => t.ticker === "AAPL");
    expect(aaplDiv).toBeDefined();
    expect(aaplDiv!.totalAmount).toBe(24);
    expect(aaplDiv!.taxes).toBe(3.60);
    expect(aaplDiv!.date).toBe("2024-03-15");

    const msftDiv = divs.find((t) => t.ticker === "MSFT");
    expect(msftDiv).toBeDefined();
    expect(msftDiv!.totalAmount).toBe(22.50);
    expect(msftDiv!.taxes).toBe(3.38);
  });

  it("skips ClosedLot rows", () => {
    const txs = ibkrParser.parse(SAMPLE_CSV, {});
    // ClosedLot rows should not appear as transactions
    const total = txs.length;
    expect(total).toBe(6); // 3 buys + 1 sell + 2 dividends
  });

  it("generates unique sourceRefs", () => {
    const txs = ibkrParser.parse(SAMPLE_CSV, {});
    const refs = txs.map((t) => t.sourceRef);
    const unique = new Set(refs);
    expect(unique.size).toBe(refs.length);
  });

  it("extracts ISINs from the CSV", () => {
    const isins = ibkrParser.extractIsins!(SAMPLE_CSV);
    expect(isins).toContain("US0378331005");
    expect(isins).toContain("US5949181045");
    expect(isins).toContain("IE00B5BMR087");
  });

  it("uses ISIN-to-ticker map for resolution", () => {
    const csv = [
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee,ISIN,Buy/Sell",
      "Trades,Data,Trade,Stocks,EUR,,2024-05-01;100000,10,50.00,-500.00,-1.00,IE00B5BMR087,BUY",
    ].join("\n");

    const txs = ibkrParser.parse(csv, { IE00B5BMR087: "SXR8.DE" });
    expect(txs.length).toBe(1);
    expect(txs[0].ticker).toBe("SXR8.DE");
  });

  it("handles IBKR compact date format YYYYMMDD;HHmmss", () => {
    const csv = [
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee",
      "Trades,Data,Trade,Stocks,USD,TSLA,20240315;093000,10,175.00,-1750.00,-0.50",
    ].join("\n");

    const txs = ibkrParser.parse(csv, {});
    expect(txs.length).toBe(1);
    expect(txs[0].date).toBe("2024-03-15");
  });

  it("returns empty for empty CSV", () => {
    expect(ibkrParser.parse("", {})).toEqual([]);
    expect(ibkrParser.parse("just a header\n", {})).toEqual([]);
  });
});
