import { describe, it, expect, vi, beforeEach } from "vitest";
import * as raw from "./admin-raw-export";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return {
    mockExecute,
    mockClient: { execute: mockExecute },
  };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const holdingRow = { id: "h1", user_id: "u1", ticker: "AAPL", shares: 5, created_at: "2024-01-01" };

describe("admin-raw-export", () => {
  describe("listHoldingsRaw", () => {
    it("SELECT only — no UPDATE", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [holdingRow] });

      const rows = await raw.listHoldingsRaw("user-1");

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute.mock.calls[0][0].sql).toContain("SELECT * FROM holdings");
      expect(mockExecute.mock.calls[0][0].sql).not.toMatch(/UPDATE/i);
      expect(rows[0]).toMatchObject({ id: "h1", ticker: "AAPL" });
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await raw.listHoldingsRaw("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("AND portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
    });
  });

  describe("listTransactionsRaw", () => {
    it("SELECT only — no UPDATE", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "tx1", user_id: "u1" }] });

      await raw.listTransactionsRaw("user-1");

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("SELECT * FROM transactions");
      expect(call.sql).not.toMatch(/UPDATE/i);
      expect(call.args).toEqual(["user-1"]);
    });

    it("uses portfolio map subquery when portfolioId is set", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await raw.listTransactionsRaw("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("transaction_portfolio_map"),
        args: ["user-1", "portfolio-1", "user-1", "portfolio-1"],
      });
    });
  });

  describe("listTransactionPortfolioMapRaw", () => {
    it("SELECT only", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await raw.listTransactionPortfolioMapRaw("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT * FROM transaction_portfolio_map"),
        args: ["user-1", "portfolio-1"],
      });
    });
  });

  describe("listCashEntriesRaw", () => {
    it("SELECT from cash_entries", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: "c1", user_id: "u1", type: "cash" }] });

      const rows = await raw.listCashEntriesRaw("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT * FROM cash_entries"),
        args: ["user-1"],
      });
      expect(rows[0]).toMatchObject({ type: "cash" });
    });
  });

  describe("listCryptoHoldingsRaw", () => {
    it("SELECT crypto holdings only", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await raw.listCryptoHoldingsRaw("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("asset_type"),
        args: ["user-1", "portfolio-1"],
      });
      expect(mockExecute.mock.calls[0][0].sql).toContain("CRYPTO");
    });
  });
});
