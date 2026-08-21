import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

import { repairExchangeAliasDuplicatesForUser } from "./repair-exchange-alias-duplicates";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("repairExchangeAliasDuplicatesForUser", () => {
  it("deletes the duplicate CPH holding and keeps OMK", async () => {
    mockExecute
      // list txs
      .mockResolvedValueOnce({
        rows: [
          { id: "tx1", ticker: "NOVO-B.CO", exchange: "CPH" },
        ],
      })
      // update tx canonicalize
      .mockResolvedValueOnce({ rowsAffected: 1 })
      // list holdings
      .mockResolvedValueOnce({
        rows: [
          {
            id: "h-omk",
            ticker: "NOVO-B.CO",
            exchange: "OMK",
            shares: 102,
            purchase_price: 320,
            value_in_eur: 4100,
            created_at: "2026-08-01",
          },
          {
            id: "h-cph",
            ticker: "NOVO-B.CO",
            exchange: "CPH",
            shares: 102,
            purchase_price: 320,
            value_in_eur: 4100,
            created_at: "2026-08-12",
          },
        ],
      })
      // update keep holding
      .mockResolvedValueOnce({ rowsAffected: 1 })
      // relink txs
      .mockResolvedValueOnce({ rowsAffected: 1 })
      // re-point txs on doomed id
      .mockResolvedValueOnce({ rowsAffected: 0 })
      // delete duplicate
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const summary = await repairExchangeAliasDuplicatesForUser("user-1");
    expect(summary.holdingsDeleted).toBe(1);
    expect(summary.txCanonicalized).toBe(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("DELETE FROM holdings"),
        args: ["h-cph", "user-1"],
      }),
    );
  });

  it("dry-run does not write", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "h-omk",
            ticker: "NOVO-B.CO",
            exchange: "OMK",
            shares: 102,
            purchase_price: 320,
            value_in_eur: 4100,
            created_at: "2026-08-01",
          },
          {
            id: "h-cph",
            ticker: "NOVO-B.CO",
            exchange: "CPH",
            shares: 102,
            purchase_price: 320,
            value_in_eur: 4100,
            created_at: "2026-08-12",
          },
        ],
      });

    const summary = await repairExchangeAliasDuplicatesForUser("user-1", { dryRun: true });
    expect(summary.holdingsDeleted).toBe(1);
    // only the two SELECTs
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});
