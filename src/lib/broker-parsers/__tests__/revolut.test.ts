import { describe, expect, it } from "vitest";
import { revolutParser } from "../revolut";
import { readFileSync } from "fs";
import { join } from "path";

const SAMPLE_CSV = readFileSync(
  join(__dirname, "../../../../docs/portfolio_sample_revolut.csv"),
  "utf-8",
);

describe("revolutParser", () => {
  it("has correct metadata", () => {
    expect(revolutParser.id).toBe("revolut");
    expect(revolutParser.label).toBe("Revolut");
  });

  it("parses buy transactions", () => {
    const txs = revolutParser.parse(SAMPLE_CSV, {});
    const buys = txs.filter((t) => t.type === "buy");
    expect(buys.length).toBe(2);

    const aaplBuy = buys.find((t) => t.ticker === "AAPL");
    expect(aaplBuy).toBeDefined();
    expect(aaplBuy!.shares).toBe(10);
    expect(aaplBuy!.pricePerShare).toBe(150.50);
    expect(aaplBuy!.totalAmount).toBe(1505);
    expect(aaplBuy!.currency).toBe("USD");
    expect(aaplBuy!.date).toBe("2024-01-15");

    const msftBuy = buys.find((t) => t.ticker === "MSFT");
    expect(msftBuy).toBeDefined();
    expect(msftBuy!.shares).toBe(5);
    expect(msftBuy!.totalAmount).toBe(2050);
  });

  it("parses sell transactions", () => {
    const txs = revolutParser.parse(SAMPLE_CSV, {});
    const sells = txs.filter((t) => t.type === "sell");
    expect(sells.length).toBe(1);

    expect(sells[0].ticker).toBe("AAPL");
    expect(sells[0].shares).toBe(5);
    expect(sells[0].pricePerShare).toBe(175.25);
    expect(sells[0].totalAmount).toBe(876.25);
    expect(sells[0].date).toBe("2024-03-20");
  });

  it("groups DIV and DIVNRA into dividend transactions", () => {
    const txs = revolutParser.parse(SAMPLE_CSV, {});
    const divs = txs.filter((t) => t.type === "dividend");
    expect(divs.length).toBe(2);

    const aaplDiv = divs.find((t) => t.ticker === "AAPL");
    expect(aaplDiv).toBeDefined();
    expect(aaplDiv!.totalAmount).toBe(2.40);
    expect(aaplDiv!.taxes).toBe(0.36);
    expect(aaplDiv!.date).toBe("2024-03-15");

    const msftDiv = divs.find((t) => t.ticker === "MSFT");
    expect(msftDiv).toBeDefined();
    expect(msftDiv!.totalAmount).toBe(3.75);
    expect(msftDiv!.taxes).toBe(0.56);
    expect(msftDiv!.date).toBe("2024-06-15");
  });

  it("skips SSP (stock split) and CDEP (cash deposit) rows", () => {
    const txs = revolutParser.parse(SAMPLE_CSV, {});
    // Total: 2 buys + 1 sell + 2 dividends = 5
    expect(txs.length).toBe(5);
  });

  it("generates unique sourceRefs", () => {
    const txs = revolutParser.parse(SAMPLE_CSV, {});
    const refs = txs.map((t) => t.sourceRef);
    const unique = new Set(refs);
    expect(unique.size).toBe(refs.length);
    refs.forEach((r) => expect(r).toMatch(/^revolut\|/));
  });

  it("handles DIV without matching DIVNRA", () => {
    const csv = [
      "Trade Date,Settle Date,Currency,Activity Type,Symbol / Description,Symbol,Description,Quantity,Price,Amount",
      "2024-03-15,2024-03-17,USD,DIV,AAPL - APPLE INC,AAPL,APPLE INC,,,5.00",
    ].join("\n");

    const txs = revolutParser.parse(csv, {});
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe("dividend");
    expect(txs[0].totalAmount).toBe(5.00);
    expect(txs[0].taxes).toBe(0);
  });

  it("uses Symbol / Description when Symbol column is empty", () => {
    const csv = [
      "Trade Date,Settle Date,Currency,Activity Type,Symbol / Description,Symbol,Description,Quantity,Price,Amount",
      "2024-01-15,2024-01-17,USD,BUY,TSLA - TESLA INC,,TESLA INC,3,200.00,-600.00",
    ].join("\n");

    const txs = revolutParser.parse(csv, {});
    expect(txs.length).toBe(1);
    expect(txs[0].ticker).toBe("TSLA");
  });

  it("returns empty for empty CSV", () => {
    expect(revolutParser.parse("", {})).toEqual([]);
    expect(revolutParser.parse("Trade Date\n", {})).toEqual([]);
  });
});
