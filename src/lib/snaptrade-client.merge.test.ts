import { describe, expect, it } from "vitest";
import {
  mergeSnapTradeTransactions,
  snapTradeTradeFingerprint,
  snapTradeOrderHasFillEvidence,
} from "@/lib/snaptrade-client";
import type { ExtractedTransaction } from "@/hooks/import-types";

function tx(
  partial: Partial<ExtractedTransaction> & Pick<ExtractedTransaction, "date" | "type" | "ticker" | "shares">,
): ExtractedTransaction {
  return {
    name: partial.ticker,
    pricePerShare: 1,
    totalAmount: partial.shares,
    fees: 0,
    currency: "EUR",
    ...partial,
  };
}

describe("snapTradeTradeFingerprint", () => {
  it("normalizes ticker case and share precision", () => {
    expect(snapTradeTradeFingerprint({ date: "2026-08-10", type: "buy", ticker: "zts", shares: 15 })).toBe(
      "2026-08-10|buy|ZTS|15000",
    );
  });
});

describe("mergeSnapTradeTransactions", () => {
  it("prefers activities over matching orders", () => {
    const activities = [
      tx({
        date: "2026-08-10",
        type: "buy",
        ticker: "ZTS",
        shares: 15,
        pricePerShare: 72.23,
        sourceRef: "snaptrade-activity:a1",
      }),
    ];
    const orders = [
      tx({
        date: "2026-08-10",
        type: "buy",
        ticker: "ZTS",
        shares: 15,
        pricePerShare: 73.18,
        sourceRef: "snaptrade-order:o1",
      }),
    ];
    const merged = mergeSnapTradeTransactions(activities, orders);
    expect(merged).toHaveLength(1);
    expect(merged[0].sourceRef).toBe("snaptrade-activity:a1");
    expect(merged[0].pricePerShare).toBe(72.23);
  });

  it("keeps orders that fill activity lag", () => {
    const activities = [
      tx({ date: "2025-03-11", type: "buy", ticker: "ICGA.DE", shares: 18, sourceRef: "snaptrade-activity:old" }),
    ];
    const orders = [
      tx({
        date: "2026-08-09",
        type: "sell",
        ticker: "ICGA.DE",
        shares: 238,
        sourceRef: "snaptrade-order:sell",
      }),
      tx({
        date: "2026-08-10",
        type: "buy",
        ticker: "ZTS",
        shares: 15,
        sourceRef: "snaptrade-order:zts",
      }),
    ];
    const merged = mergeSnapTradeTransactions(activities, orders);
    expect(merged.map((t) => t.sourceRef)).toEqual([
      "snaptrade-activity:old",
      "snaptrade-order:sell",
      "snaptrade-order:zts",
    ]);
  });

  it("skips orders already present in the ledger fingerprint set", () => {
    const existing = new Set([snapTradeTradeFingerprint({ date: "2026-08-09", type: "sell", ticker: "ICGA.DE", shares: 238 })]);
    const merged = mergeSnapTradeTransactions(
      [],
      [tx({ date: "2026-08-09", type: "sell", ticker: "ICGA.DE", shares: 238, sourceRef: "snaptrade-order:x" })],
      { existingFingerprints: existing },
    );
    expect(merged).toHaveLength(0);
  });
});

describe("snapTradeOrderHasFillEvidence", () => {
  it("rejects pending DEGIRO limit sells still held in full", () => {
    expect(
      snapTradeOrderHasFillEvidence(
        { filled_quantity: null, execution_price: null },
        "sell",
        44,
        44,
      ),
    ).toBe(false);
  });

  it("accepts sells when the position is gone", () => {
    expect(
      snapTradeOrderHasFillEvidence(
        { filled_quantity: null, execution_price: null },
        "sell",
        238,
        0,
      ),
    ).toBe(true);
  });

  it("accepts buys when position units exist", () => {
    expect(
      snapTradeOrderHasFillEvidence(
        { filled_quantity: null, execution_price: null },
        "buy",
        15,
        15,
      ),
    ).toBe(true);
  });
});
