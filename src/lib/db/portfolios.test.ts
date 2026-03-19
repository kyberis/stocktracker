import { describe, it, expect, vi, beforeEach } from "vitest";
import * as portfolios from "./portfolios";

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

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid-123"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset queued mockResolvedValueOnce implementations (clearAllMocks alone does not).
  mockExecute.mockReset();
  mockBatch.mockReset();
});

const portfolioRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "p1",
  user_id: "user-1",
  name: "My Portfolio",
  is_default: 1,
  sort_order: 0,
  currency: "EUR",
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("portfolios", () => {
  describe("listPortfolios", () => {
    it("returns mapped Portfolio array from rows", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          portfolioRow({ id: "p1", name: "Default" }),
          portfolioRow({ id: "p2", name: "Crypto", is_default: 0, sort_order: 1 }),
        ],
      });
      const result = await portfolios.listPortfolios("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM portfolios WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
        args: ["user-1"],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "p1", name: "Default", isDefault: true });
      expect(result[1]).toMatchObject({ id: "p2", name: "Crypto", isDefault: false, sortOrder: 1 });
    });

    it("returns empty array when no portfolios", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await portfolios.listPortfolios("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("getDefaultPortfolio", () => {
    it("returns existing default portfolio", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [portfolioRow({ id: "default-id", name: "My Portfolio" })],
      });
      const result = await portfolios.getDefaultPortfolio("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM portfolios WHERE user_id = ? AND is_default = 1",
        args: ["user-1"],
      });
      expect(result).toMatchObject({ id: "default-id", name: "My Portfolio", isDefault: true });
    });

    it("auto-creates default portfolio when missing", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [portfolioRow({ id: "test-uuid-123", name: "My Portfolio" })] });

      const result = await portfolios.getDefaultPortfolio("user-1");
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT OR IGNORE INTO portfolios"),
        args: expect.any(Array),
      });
      expect(result).toMatchObject({ id: "test-uuid-123", isDefault: true });
    });
  });

  describe("createPortfolio", () => {
    it("inserts with next sort_order and returns Portfolio", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ mx: 2 }] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await portfolios.createPortfolio("user-1", "Crypto", "USD");
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT MAX(sort_order) as mx FROM portfolios WHERE user_id = ?",
        args: ["user-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "INSERT INTO portfolios (id, user_id, name, is_default, sort_order, currency) VALUES (?, ?, ?, 0, ?, ?)",
        args: expect.arrayContaining(["user-1", "Crypto", 3, "USD"]),
      });
      expect(result).toMatchObject({
        name: "Crypto",
        isDefault: false,
        sortOrder: 3,
        currency: "USD",
      });
    });

    it("uses EUR when currency omitted", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ mx: 0 }] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await portfolios.createPortfolio("user-1", "Stocks");
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.any(String),
        args: expect.arrayContaining(["EUR"]),
      });
      expect(result.currency).toBe("EUR");
    });
  });

  describe("deletePortfolio", () => {
    it("returns false when portfolio is default", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ is_default: 1 }],
      });
      const result = await portfolios.deletePortfolio("user-1", "default-id");
      expect(result).toBe(false);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("returns false when portfolio not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await portfolios.deletePortfolio("user-1", "nonexistent");
      expect(result).toBe(false);
    });

    it("deletes all scoped data and the portfolio row when not default", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ is_default: 0 }] })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await portfolios.deletePortfolio("user-1", "non-default-id");
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("DELETE FROM portfolios"),
        args: ["non-default-id", "user-1"],
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("DELETE FROM portfolio_snapshots"),
        args: ["user-1", "non-default-id"],
      });
    });
  });

  describe("resolvePortfolioId", () => {
    it("returns given portfolioId when provided", async () => {
      const result = await portfolios.resolvePortfolioId("user-1", "custom-portfolio-id");
      expect(result).toBe("custom-portfolio-id");
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns default portfolio id when portfolioId omitted", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [portfolioRow({ id: "default-portfolio-id" })],
      });
      const result = await portfolios.resolvePortfolioId("user-1");
      expect(result).toBe("default-portfolio-id");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM portfolios WHERE user_id = ? AND is_default = 1",
        args: ["user-1"],
      });
    });
  });

  describe("countPortfolios", () => {
    it("returns count from SELECT COUNT", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
      const result = await portfolios.countPortfolios("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT COUNT(*) as cnt FROM portfolios WHERE user_id = ?",
        args: ["user-1"],
      });
      expect(result).toBe(3);
    });

    it("returns 0 when no rows", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await portfolios.countPortfolios("user-1");
      expect(result).toBe(0);
    });
  });

  describe("renamePortfolio", () => {
    it("returns true when update affects rows", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      const result = await portfolios.renamePortfolio("user-1", "p1", "New Name");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE portfolios SET name = ? WHERE id = ? AND user_id = ?",
        args: ["New Name", "p1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when no rows affected", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      const result = await portfolios.renamePortfolio("user-1", "p1", "New Name");
      expect(result).toBe(false);
    });
  });

  describe("updatePortfolioCurrency", () => {
    it("returns true when update succeeds", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      const result = await portfolios.updatePortfolioCurrency("user-1", "p1", "GBP");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE portfolios SET currency = ? WHERE id = ? AND user_id = ?",
        args: ["GBP", "p1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when no rows affected", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      const result = await portfolios.updatePortfolioCurrency("user-1", "nonexistent", "GBP");
      expect(result).toBe(false);
    });
  });

  describe("setDefaultPortfolio", () => {
    it("returns false when portfolio does not exist", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await portfolios.setDefaultPortfolio("user-1", "nonexistent");
      expect(result).toBe(false);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT id FROM portfolios WHERE id = ? AND user_id = ?",
        args: ["nonexistent", "user-1"],
      });
    });

    it("unsets all defaults and sets new default when portfolio exists", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ id: "p2" }] })
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await portfolios.setDefaultPortfolio("user-1", "p2");

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "UPDATE portfolios SET is_default = 0 WHERE user_id = ?",
        args: ["user-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(3, {
        sql: "UPDATE portfolios SET is_default = 1 WHERE id = ? AND user_id = ?",
        args: ["p2", "user-1"],
      });
    });
  });

  describe("findPortfolioById", () => {
    it("returns Portfolio when found", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [portfolioRow({ id: "p1", name: "Found" })],
      });
      const result = await portfolios.findPortfolioById("user-1", "p1");
      expect(result).toMatchObject({ id: "p1", name: "Found" });
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const result = await portfolios.findPortfolioById("user-1", "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("ensureDefaultPortfolio", () => {
    it("returns default portfolio id", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [portfolioRow({ id: "default-id" })],
      });
      const result = await portfolios.ensureDefaultPortfolio("user-1");
      expect(result).toBe("default-id");
    });
  });

  describe("moveHoldingToPortfolio", () => {
    it("updates holdings and transactions, returns true when holdings affected", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rowsAffected: 3 });

      const result = await portfolios.moveHoldingToPortfolio(
        "user-1",
        "AAPL",
        "",
        "from-portfolio",
        "to-portfolio"
      );

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("UPDATE holdings SET portfolio_id = ?"),
        args: ["to-portfolio", "user-1", "from-portfolio", "AAPL", ""],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE transactions SET portfolio_id = ?"),
        args: ["to-portfolio", "user-1", "from-portfolio", "AAPL", ""],
      });
    });

    it("returns false when no holdings affected", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 });

      const result = await portfolios.moveHoldingToPortfolio(
        "user-1",
        "MSFT",
        "XNAS",
        "from-portfolio",
        "to-portfolio"
      );

      expect(result).toBe(false);
    });
  });
});
