import { describe, it, expect, vi, beforeEach } from "vitest";
import * as cash from "./cash";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("./portfolios", () => ({
  resolvePortfolioId: vi.fn().mockResolvedValue("default-portfolio-id"),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("cash-uuid-789"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cash", () => {
  const cashEntryRow = {
    id: "cash-1",
    name: "Savings",
    amount_eur: 5000,
    type: "savings",
    source: "manual",
    display_currency: "EUR",
    display_amount: 5000,
    notes: "Emergency fund",
    valuation_date: "2024-01-01",
  };

  describe("listCashEntries", () => {
    it("lists entries without portfolioId filter", async () => {
      mockExecute.mockResolvedValue({ rows: [cashEntryRow] });
      const result = await cash.listCashEntries("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT id, name, amount_eur"),
        args: ["user-1"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "cash-1",
        name: "Savings",
        amountEUR: 5000,
        type: "savings",
        source: "manual",
        displayCurrency: "EUR",
        displayAmount: 5000,
        notes: "Emergency fund",
        valuationDate: "2024-01-01",
      });
    });

    it("lists entries with portfolioId filter", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await cash.listCashEntries("user-1", "portfolio-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
    });
  });

  describe("addCashEntry", () => {
    it("inserts with ON CONFLICT and returns CashEntry with RETURNING id", async () => {
      mockExecute.mockResolvedValue({ rows: [{ id: "returned-id-123" }] });
      const entry = {
        name: "Checking",
        amountEUR: 1000,
        type: "cash" as const,
        source: "manual",
      };
      const result = await cash.addCashEntry("user-1", entry);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO cash_entries"),
        args: expect.arrayContaining([
          "cash-uuid-789",
          "user-1",
          "Checking",
          1000,
          "cash",
          "manual",
        ]),
      });
      expect(result.id).toBe("returned-id-123");
      expect(result).toMatchObject({
        name: "Checking",
        amountEUR: 1000,
        type: "cash",
        source: "manual",
      });
    });

    it("uses generated id when RETURNING has no rows", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const entry = { name: "New", amountEUR: 500 };
      const result = await cash.addCashEntry("user-1", entry);
      expect(result.id).toBe("cash-uuid-789");
    });

    it("calls resolvePortfolioId when portfolioId provided", async () => {
      const { resolvePortfolioId } = await import("./portfolios");
      mockExecute.mockResolvedValue({ rows: [{ id: "id-1" }] });
      await cash.addCashEntry("user-1", { name: "X", amountEUR: 100 }, "portfolio-1");
      expect(resolvePortfolioId).toHaveBeenCalledWith("user-1", "portfolio-1");
    });
  });

  describe("updateCashEntry", () => {
    it("returns updated CashEntry when found", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [cashEntryRow] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await cash.updateCashEntry("user-1", "cash-1", {
        name: "Updated Savings",
        amountEUR: 6000,
      });
      expect(result).toMatchObject({
        id: "cash-1",
        name: "Updated Savings",
        amountEUR: 6000,
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await cash.updateCashEntry("user-1", "cash-nonexistent", { name: "X" });
      expect(result).toBeNull();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeCashEntry", () => {
    it("returns true when rowsAffected > 0", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      const result = await cash.removeCashEntry("user-1", "cash-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM cash_entries WHERE id = ? AND user_id = ?",
        args: ["cash-1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when rowsAffected === 0", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 0 });
      const result = await cash.removeCashEntry("user-1", "cash-nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("removeCashEntriesBySource", () => {
    it("removes by source without portfolioId", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 3 });
      const result = await cash.removeCashEntriesBySource("user-1", "broker-import");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM cash_entries WHERE user_id = ? AND source = ?",
        args: ["user-1", "broker-import"],
      });
      expect(result).toBe(3);
    });

    it("removes by source with portfolioId", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      const result = await cash.removeCashEntriesBySource("user-1", "broker-import", "portfolio-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("portfolio_id = ?"),
        args: ["user-1", "broker-import", "portfolio-1"],
      });
      expect(result).toBe(1);
    });
  });

  describe("getManualAssetCount", () => {
    it("returns count without portfolioId", async () => {
      mockExecute.mockResolvedValue({ rows: [{ cnt: 2 }] });
      const result = await cash.getManualAssetCount("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("COUNT(*)"),
        args: ["user-1"],
      });
      expect(result).toBe(2);
    });

    it("returns count with portfolioId", async () => {
      mockExecute.mockResolvedValue({ rows: [{ cnt: 1 }] });
      const result = await cash.getManualAssetCount("user-1", "portfolio-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
      expect(result).toBe(1);
    });

    it("returns 0 when no rows", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await cash.getManualAssetCount("user-1");
      expect(result).toBe(0);
    });
  });
});
