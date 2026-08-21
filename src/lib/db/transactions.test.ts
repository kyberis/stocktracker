import { describe, it, expect, vi, beforeEach } from "vitest";
import * as transactions from "./transactions";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  return {
    mockExecute,
    mockBatch,
    mockClient: { execute: mockExecute, batch: mockBatch },
  };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("./portfolios", () => ({
  resolvePortfolioId: vi.fn().mockResolvedValue("default-portfolio-id"),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("tx-uuid-123"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const txRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "tx1",
  holding_id: "h1",
  ticker: "AAPL",
  name: "Apple Inc",
  exchange: "",
  isin: "",
  asset_type: "stock",
  account_id: "",
  type: "buy",
  date: "2024-01-15",
  shares: 10,
  price_per_share: 100,
  total_amount: 1000,
  fees: 0,
  taxes: 0,
  currency: "USD",
  display_currency: "USD",
  exchange_rate_eur: null,
  notes: "",
  source_ref: "",
  broker_name: "",
  created_at: "2024-01-15T12:00:00Z",
  ...overrides,
});

const buyTx = {
  holdingId: "",
  ticker: "AAPL",
  exchange: "",
  name: "Apple Inc",
  isin: "",
  assetType: "stock" as const,
  type: "buy" as const,
  date: "2024-01-15",
  shares: 10,
  pricePerShare: 100,
  totalAmount: 1000,
  fees: 0,
  taxes: 0,
  currency: "USD",
  notes: "",
};

describe("transactions", () => {
  describe("listTransactions", () => {
    it("returns transactions for user when no holdingId or portfolioId", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          txRow({ id: "tx1", ticker: "AAPL" }),
          txRow({ id: "tx2", ticker: "MSFT" }),
        ],
      });

      const result = await transactions.listTransactions("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC",
        args: ["user-1"],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "tx1", ticker: "AAPL" });
      expect(result[1]).toMatchObject({ id: "tx2", ticker: "MSFT" });
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [txRow({ id: "tx1", ticker: "AAPL", portfolio_id: "portfolio-1" })],
      });

      const result = await transactions.listTransactions("user-1", undefined, "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("portfolio_id"),
        args: ["user-1", "portfolio-1", "user-1", "portfolio-1"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "tx1", ticker: "AAPL" });
    });

    it("filters by holdingId and portfolioId with ticker match (OR unlinked)", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ ticker: "AAPL", exchange: "US" }],
        })
        .mockResolvedValueOnce({
          rows: [
            txRow({ id: "tx1", holding_id: "h1", ticker: "AAPL", exchange: "US" }),
            txRow({ id: "tx2", holding_id: "", ticker: "AAPL", exchange: "US" }),
          ],
        });

      const result = await transactions.listTransactions("user-1", "h1", "portfolio-1");

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT ticker, exchange FROM holdings WHERE id = ? AND user_id = ?",
        args: ["h1", "user-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("holding_id = '' AND UPPER(ticker) = UPPER(?)"),
        args: ["user-1", "portfolio-1", "user-1", "portfolio-1", "h1", "AAPL", "US"],
      });
      expect(result).toHaveLength(2);
    });

    it("filters by holdingId only when holdings returns no ticker", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [txRow({ id: "tx1", holding_id: "h1" })],
        });

      const result = await transactions.listTransactions("user-1", "h1");

      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "SELECT * FROM transactions WHERE user_id = ? AND holding_id = ? ORDER BY date DESC, created_at DESC",
        args: ["user-1", "h1"],
      });
      expect(result).toHaveLength(1);
    });

    it("self-heals unlinked transactions by backfilling holding_id", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ ticker: "AAPL", exchange: "" }],
        })
        .mockResolvedValueOnce({
          rows: [
            txRow({ id: "tx1", holding_id: "", ticker: "AAPL", exchange: "" }),
            txRow({ id: "tx2", holding_id: "", ticker: "AAPL", exchange: "" }),
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 2 });

      const result = await transactions.listTransactions("user-1", "h1", "portfolio-1");

      expect(mockExecute).toHaveBeenNthCalledWith(3, {
        sql: expect.stringContaining("UPDATE transactions SET holding_id = ?"),
        args: ["h1", "", "", "tx1", "tx2", "user-1"],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("addTransaction", () => {
    it("inserts buy transaction and syncs holding when no existing holding", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await transactions.addTransaction("user-1", buyTx);

      expect(mockExecute).toHaveBeenCalledTimes(5);
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("INSERT INTO transactions"),
        args: expect.arrayContaining(["user-1", "AAPL", "buy", "2024-01-15", 10, 100, 1000]),
      });
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: "tx-uuid-123",
        ticker: "AAPL",
        type: "buy",
        shares: 10,
        totalAmount: 1000,
      });
    });

    it("inserts dividend transaction without holding sync", async () => {
      const dividendTx = {
        ...buyTx,
        type: "dividend" as const,
        shares: 0,
        pricePerShare: 0,
        totalAmount: 50,
      };
      mockExecute.mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await transactions.addTransaction("user-1", dividendTx);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: "tx-uuid-123",
        type: "dividend",
        totalAmount: 50,
      });
    });

    it("returns null when source_ref duplicate (UNIQUE constraint failed)", async () => {
      mockExecute.mockRejectedValueOnce(new Error("UNIQUE constraint failed: transactions.source_ref"));

      const result = await transactions.addTransaction("user-1", {
        ...buyTx,
        sourceRef: "dup-ref",
      });

      expect(result).toBeNull();
    });

    it("throws when UNIQUE constraint failed but sourceRef is empty", async () => {
      mockExecute.mockRejectedValueOnce(new Error("UNIQUE constraint failed: transactions.source_ref"));

      await expect(
        transactions.addTransaction("user-1", buyTx)
      ).rejects.toThrow("UNIQUE constraint failed");
    });

    it("syncs holding on sell with existing holding (full sell, DELETE)", async () => {
      const sellTx = {
        ...buyTx,
        type: "sell" as const,
        shares: 10,
        totalAmount: 1000,
      };
      mockExecute
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // INSERT tx
        .mockResolvedValueOnce({ rows: [] }) // find by ticker+exchange ""
        .mockResolvedValueOnce({
          rows: [{ id: "h1", shares: 10, purchase_price: 100, exchange: "" }],
        }) // find by ticker only
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // DELETE holding
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }); // UPDATE holding_id on tx

      const result = await transactions.addTransaction("user-1", sellTx);

      expect(mockExecute).toHaveBeenCalledTimes(5);
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("INSERT INTO transactions"),
        args: expect.arrayContaining(["user-1", "AAPL", "sell", 10]),
      });
      expect(result).not.toBeNull();
      expect(result?.holdingId).toBe("h1");
    });

    it("syncs holding on sell with existing holding (partial sell, UPDATE)", async () => {
      const sellTx = {
        ...buyTx,
        type: "sell" as const,
        shares: 5,
        totalAmount: 500,
      };
      mockExecute
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // INSERT tx
        .mockResolvedValueOnce({ rows: [] }) // find by ticker+exchange
        .mockResolvedValueOnce({
          rows: [{ id: "h1", shares: 10, purchase_price: 100, exchange: "" }],
        }) // find by ticker only
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // UPDATE shares
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }); // UPDATE holding_id

      const result = await transactions.addTransaction("user-1", sellTx);

      expect(mockExecute).toHaveBeenCalledTimes(5);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
        args: [5, 100, "h1", "user-1"],
      });
      expect(result).not.toBeNull();
      expect(result?.holdingId).toBe("h1");
    });
  });

  describe("addTransactionsBulk", () => {
    it("returns {0,0} for empty array", async () => {
      const result = await transactions.addTransactionsBulk("user-1", []);

      expect(result).toEqual({ inserted: 0, skipped: 0 });
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockBatch).not.toHaveBeenCalled();
    });

    it("calls batch for non-empty array", async () => {
      mockBatch.mockResolvedValueOnce([{ rowsAffected: 1 }, { rowsAffected: 0 }]);
      // linkUnlinkedTransactionsToHoldings: SELECT holdings (none)
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await transactions.addTransactionsBulk("user-1", [
        { ...buyTx, date: "2024-01-01" },
        { ...buyTx, ticker: "MSFT", date: "2024-01-02", sourceRef: "dup" },
      ]);

      expect(mockBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sql: expect.stringContaining("INSERT OR IGNORE INTO transactions"),
            args: expect.any(Array),
          }),
        ]),
        "write"
      );
      expect(result).toEqual({ inserted: 1, skipped: 1 });
    });

    it("links inserted txs to existing holdings and backfills blank exchange", async () => {
      mockBatch.mockResolvedValueOnce([{ rowsAffected: 1 }]);
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ id: "hold-zts", ticker: "ZTS", exchange: "NYSE" }],
        })
        .mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await transactions.addTransactionsBulk("user-1", [
        {
          ...buyTx,
          ticker: "ZTS",
          name: "Zoetis Inc.",
          exchange: "",
          sourceRef: "snaptrade-order:abc",
        },
      ]);

      expect(result).toEqual({ inserted: 1, skipped: 0 });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT id, ticker, exchange FROM holdings"),
        args: ["user-1", "default-portfolio-id"],
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("UPDATE transactions SET"),
        args: expect.arrayContaining(["hold-zts", "NYSE", "ZTS", "user-1", "default-portfolio-id", "ZTS"]),
      });
    });
  });

  describe("linkUnlinkedTransactionsToHoldings", () => {
    it("returns 0 when no holdings", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const n = await transactions.linkUnlinkedTransactionsToHoldings("user-1", "p1");
      expect(n).toBe(0);
    });
  });

  describe("updateTransaction", () => {
    it("returns false when updates empty", async () => {
      const result = await transactions.updateTransaction("user-1", "tx1", {});

      expect(result).toBe(false);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns true when update succeeds", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await transactions.updateTransaction("user-1", "tx1", {
        notes: "Updated note",
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("UPDATE transactions SET notes = ?"),
        args: ["Updated note", "tx1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("updates multiple fields in one statement", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await transactions.updateTransaction("user-1", "tx1", {
        type: "sell",
        date: "2024-02-01",
        shares: 5,
        pricePerShare: 110,
        totalAmount: 550,
        notes: "Sold half",
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("UPDATE transactions SET"),
        args: expect.arrayContaining(["sell", "2024-02-01", 5, 110, 550, "Sold half", "tx1", "user-1"]),
      });
      expect(result).toBe(true);
    });
  });

  describe("deleteTransaction", () => {
    it("returns true when delete succeeds", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await transactions.deleteTransaction("user-1", "tx1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?",
        args: ["tx1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when no rows affected", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

      const result = await transactions.deleteTransaction("user-1", "nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("deleteTransactionsForPosition", () => {
    it("deletes by ticker and exchange", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 5 });

      const result = await transactions.deleteTransactionsForPosition(
        "user-1",
        "AAPL",
        ""
      );

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("DELETE FROM transactions"),
        args: ["user-1", "AAPL", ""],
      });
      expect(result).toBe(5);
    });

    it("filters by portfolioId and re-assigns surviving transactions", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 1 })  // delete map entries
        .mockResolvedValueOnce({ rowsAffected: 2 })  // delete orphan txs
        .mockResolvedValueOnce({ rowsAffected: 0 }); // re-assign surviving txs

      const result = await transactions.deleteTransactionsForPosition(
        "user-1",
        "AAPL",
        "",
        "portfolio-1"
      );

      expect(result).toBe(2);
      const allSql = mockExecute.mock.calls.map((c) => c[0]?.sql || "");
      expect(allSql.some((s: string) => s.includes("DELETE FROM transaction_portfolio_map"))).toBe(true);
      expect(allSql.some((s: string) => s.includes("UPDATE transactions SET portfolio_id"))).toBe(true);
    });
  });

  describe("deleteAllTransactions", () => {
    it("deletes all for user", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 10 });

      const result = await transactions.deleteAllTransactions("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM transactions WHERE user_id = ?",
        args: ["user-1"],
      });
      expect(result).toBe(10);
    });

    it("filters by portfolioId, removes map entries, and re-assigns surviving txs", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 2 })  // delete map entries
        .mockResolvedValueOnce({ rowsAffected: 3 })  // delete orphan txs
        .mockResolvedValueOnce({ rowsAffected: 1 }); // re-assign surviving txs

      const result = await transactions.deleteAllTransactions("user-1", "portfolio-1");

      expect(result).toBe(3);

      const allSql = mockExecute.mock.calls.map((c) => c[0]?.sql || "");
      expect(allSql[0]).toContain("DELETE FROM transaction_portfolio_map");
      expect(allSql[1]).toContain("DELETE FROM transactions");
      expect(allSql[1]).toContain("NOT IN");
      expect(allSql[2]).toContain("UPDATE transactions SET portfolio_id");
    });
  });

  describe("listTransactionSourceRefs", () => {
    it("returns Set of source_ref values", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          { source_ref: "ref-1" },
          { source_ref: "ref-2" },
          { source_ref: "ref-1" },
        ],
      });

      const result = await transactions.listTransactionSourceRefs("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("source_ref"),
        args: ["user-1"],
      });
      expect(result).toEqual(new Set(["ref-1", "ref-2"]));
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ source_ref: "ref-a" }] });

      const result = await transactions.listTransactionSourceRefs(
        "user-1",
        "portfolio-1"
      );

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("portfolio_id = ?"),
        args: ["user-1", "portfolio-1", "user-1", "portfolio-1"],
      });
      expect(result).toEqual(new Set(["ref-a"]));
    });

    it("returns empty Set when no source_refs", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await transactions.listTransactionSourceRefs("user-1");

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
      expect([...result]).toEqual([]);
    });
  });
});
