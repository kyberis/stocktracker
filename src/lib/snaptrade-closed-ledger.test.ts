import { describe, expect, it } from "vitest";
import {
  filterClosedSnaptradeLedgerHoldings,
  isSnaptradeOnlyTradeLedger,
} from "./snaptrade-closed-ledger";
import type { Holding, Transaction } from "./types";

function tx(
  partial: Partial<Transaction> & Pick<Transaction, "type" | "ticker" | "shares">,
): Transaction {
  return {
    id: partial.id || "tx",
    holdingId: "",
    ticker: partial.ticker,
    name: partial.name || partial.ticker,
    exchange: partial.exchange ?? "NYSE",
    isin: "",
    assetType: "stock",
    accountId: "",
    type: partial.type,
    date: partial.date || "2024-01-01",
    shares: partial.shares,
    pricePerShare: partial.pricePerShare ?? 10,
    totalAmount: partial.totalAmount ?? partial.shares * 10,
    fees: 0,
    taxes: 0,
    currency: "USD",
    displayCurrency: "USD",
    notes: "",
    sourceRef: partial.sourceRef,
    createdAt: partial.createdAt || "2024-01-01T00:00:00.000Z",
  };
}

describe("isSnaptradeOnlyTradeLedger", () => {
  it("is true when all buys/sells are snaptrade-sourced", () => {
    expect(
      isSnaptradeOnlyTradeLedger(
        [
          tx({ type: "buy", ticker: "EPR", shares: 5, sourceRef: "snaptrade-activity:a" }),
          tx({ type: "sell", ticker: "EPR", shares: 3, sourceRef: "snaptrade-activity:b" }),
          tx({ type: "dividend", ticker: "EPR", shares: 0, sourceRef: "snaptrade-activity:c" }),
        ],
        "EPR",
        "NYSE",
      ),
    ).toBe(true);
  });

  it("is false when any trade is manual / CSV", () => {
    expect(
      isSnaptradeOnlyTradeLedger(
        [
          tx({ type: "buy", ticker: "EPR", shares: 5, sourceRef: "snaptrade-activity:a" }),
          tx({ type: "sell", ticker: "EPR", shares: 2, sourceRef: "" }),
        ],
        "EPR",
        "NYSE",
      ),
    ).toBe(false);
  });
});

describe("filterClosedSnaptradeLedgerHoldings", () => {
  const open = new Set(["AAPL|NASDAQ"]);

  it("suppresses snaptrade-only EPR when broker no longer lists it", () => {
    const derived = [
      { ticker: "EPR", exchange: "NYSE", shares: 2 },
      { ticker: "UBER", exchange: "NYSE", shares: 10 },
    ] as Holding[];
    const txs = [
      tx({ type: "buy", ticker: "EPR", shares: 5, sourceRef: "snaptrade-activity:a" }),
      tx({ type: "sell", ticker: "EPR", shares: 3, sourceRef: "snaptrade-activity:b" }),
      tx({
        type: "buy",
        ticker: "UBER",
        shares: 10,
        sourceRef: "",
        notes: "manual",
      }),
    ];
    const filtered = filterClosedSnaptradeLedgerHoldings(derived, txs, open);
    expect(filtered.map((h) => h.ticker)).toEqual(["UBER"]);
  });

  it("does nothing when there is no open SnapTrade snapshot", () => {
    const derived = [{ ticker: "EPR", exchange: "NYSE", shares: 2 }] as Holding[];
    const txs = [tx({ type: "buy", ticker: "EPR", shares: 5, sourceRef: "snaptrade-activity:a" })];
    expect(filterClosedSnaptradeLedgerHoldings(derived, txs, new Set())).toHaveLength(1);
  });
});
