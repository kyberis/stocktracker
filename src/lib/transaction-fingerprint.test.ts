import { describe, expect, it } from "vitest";
import {
  filterNewTransactions,
  isDuplicateAgainstLedger,
  snapTradeTradeFingerprint,
  transactionContentFingerprint,
} from "./transaction-fingerprint";

describe("transactionContentFingerprint", () => {
  it("includes date, type, ticker, shares, and total amount", () => {
    expect(
      transactionContentFingerprint({
        date: "2024-03-15",
        type: "buy",
        ticker: "regn",
        shares: 10,
        totalAmount: 7250.5,
      }),
    ).toBe("2024-03-15|buy|REGN|10000|725050");
  });

  it("derives total from shares × price when totalAmount is zero", () => {
    expect(
      transactionContentFingerprint({
        date: "2024-03-15",
        type: "buy",
        ticker: "REGN",
        shares: 5,
        pricePerShare: 100,
        totalAmount: 0,
      }),
    ).toBe("2024-03-15|buy|REGN|5000|50000");
  });

  it("treats same trade from different sources as duplicate", () => {
    const csv = transactionContentFingerprint({
      date: "2024-03-15",
      type: "buy",
      ticker: "REGN",
      shares: 10,
      totalAmount: 7250.5,
    });
    const snaptrade = transactionContentFingerprint({
      date: "2024-03-15",
      type: "buy",
      ticker: "REGN",
      shares: 10,
      totalAmount: 7250.5,
    });
    expect(csv).toBe(snaptrade);
  });
});

describe("snapTradeTradeFingerprint", () => {
  it("matches activities and orders without amount", () => {
    const activity = snapTradeTradeFingerprint({ date: "2026-08-10", type: "buy", ticker: "zts", shares: 15 });
    const order = snapTradeTradeFingerprint({ date: "2026-08-10", type: "buy", ticker: "ZTS", shares: 15 });
    expect(activity).toBe(order);
  });
});

describe("filterNewTransactions", () => {
  it("removes duplicates within batch and against ledger", () => {
    const existing = new Set(["2024-01-01|buy|AAPL|1000|10000"]);
    const incoming = [
      { date: "2024-01-01", type: "buy", ticker: "AAPL", shares: 1, totalAmount: 100 },
      { date: "2024-01-02", type: "buy", ticker: "MSFT", shares: 2, totalAmount: 200 },
      { date: "2024-01-02", type: "buy", ticker: "MSFT", shares: 2, totalAmount: 200 },
    ];
    const { kept, removed } = filterNewTransactions(incoming, existing);
    expect(kept).toHaveLength(1);
    expect(kept[0].ticker).toBe("MSFT");
    expect(removed).toBe(2);
  });
});

describe("isDuplicateAgainstLedger", () => {
  it("detects duplicate by sourceRef or content fingerprint", () => {
    const fps = new Set([transactionContentFingerprint({
      date: "2024-03-15", type: "buy", ticker: "REGN", shares: 10, totalAmount: 7250.5,
    })]);
    const refs = new Set(["degiro|ref-1"]);
    expect(isDuplicateAgainstLedger(
      { date: "2024-03-15", type: "buy", ticker: "REGN", shares: 10, totalAmount: 7250.5 },
      fps,
    )).toBe(true);
    expect(isDuplicateAgainstLedger(
      { date: "2024-03-15", type: "buy", ticker: "REGN", shares: 10, totalAmount: 7250.5 },
      new Set(),
      refs,
      "degiro|ref-1",
    )).toBe(true);
    expect(isDuplicateAgainstLedger(
      { date: "2024-03-15", type: "buy", ticker: "REGN", shares: 11, totalAmount: 7250.5 },
      fps,
    )).toBe(false);
  });
});
