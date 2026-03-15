import { describe, it, expect, vi, beforeEach } from "vitest";
import * as holdings from "./holdings";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid-123"),
}));

vi.mock("@/lib/derive-holdings", () => ({
  deriveHoldingsFromTransactions: vi.fn().mockReturnValue([]),
}));

vi.mock("./seed", () => ({
  seedHoldingsForUser: vi.fn().mockResolvedValue(5),
  seedCashForUser: vi.fn().mockResolvedValue(2),
  seedTransactionsForUser: vi.fn().mockResolvedValue(10),
}));

vi.mock("./transactions", () => ({
  listTransactions: vi.fn().mockResolvedValue([]),
}));

vi.mock("./accounts", () => ({
  findOrCreateBrokerAccount: vi.fn().mockResolvedValue({ id: "acct-1", name: "Broker", broker: "degiro", currency: "EUR", createdAt: "2024-01-01" }),
}));

vi.mock("./portfolios", () => ({
  resolvePortfolioId: vi.fn().mockResolvedValue("portfolio-1"),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({ regularMarketPrice: 100, currency: "USD" }),
    getExchangeRate: vi.fn().mockResolvedValue(1.1),
  })),
}));

vi.mock("@/lib/utils", () => ({
  convertToEUR: vi.fn((val: number) => val / 1.1),
  resolveQuoteCurrency: vi.fn((display: string, quote: string) => quote || display),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const holdingRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "h1",
  name: "Apple Inc",
  ticker: "AAPL",
  isin: "US0378331005",
  asset_type: "stock",
  shares: 10,
  purchase_price: 150,
  display_currency: "USD",
  exchange: "",
  value_in_eur: 1500,
  sector: "",
  region: "",
  asset_class: "",
  account_id: "",
  ...overrides,
});

describe("holdings", () => {
  describe("listHoldings", () => {
    it("returns holdings from rows when holdings exist", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          holdingRow({ id: "h1", ticker: "AAPL", name: "Apple Inc", shares: 10, purchase_price: 150 }),
          holdingRow({ id: "h2", ticker: "MSFT", name: "Microsoft", shares: 5, purchase_price: 300 }),
        ],
      });

      const result = await holdings.listHoldings("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT id, name, ticker"),
        args: ["user-1"],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ ticker: "AAPL", name: "Apple Inc", shares: 10, purchasePrice: 150 });
      expect(result[1]).toMatchObject({ ticker: "MSFT", name: "Microsoft", shares: 5, purchasePrice: 300 });
    });

    it("aggregates duplicate tickers by adding shares and averaging purchase price", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          holdingRow({ id: "h1", ticker: "AAPL", shares: 10, purchase_price: 100 }),
          holdingRow({ id: "h2", ticker: "AAPL", shares: 5, purchase_price: 120 }),
        ],
      });

      const result = await holdings.listHoldings("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ ticker: "AAPL", shares: 15 });
      // (10*100 + 5*120) / 15 = 106.67
      expect(result[0].purchasePrice).toBeCloseTo(106.66666666666667);
    });

    it("filters out holdings with shares <= 0", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          holdingRow({ id: "h1", ticker: "AAPL", shares: 10 }),
          holdingRow({ id: "h2", ticker: "SOLD", shares: 0 }),
          holdingRow({ id: "h3", ticker: "MSFT", shares: 5 }),
        ],
      });

      const result = await holdings.listHoldings("user-1");

      expect(result).toHaveLength(2);
      expect(result.map((h) => h.ticker)).toEqual(["AAPL", "MSFT"]);
    });

    it("falls back to rebuildHoldings when no holdings rows but transactions exist", async () => {
      const { deriveHoldingsFromTransactions } = await import("@/lib/derive-holdings");
      const { listTransactions } = await import("./transactions");

      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

      vi.mocked(listTransactions).mockResolvedValueOnce([
        { id: "tx1", ticker: "AAPL", type: "buy", shares: 10 } as never,
      ]);
      vi.mocked(deriveHoldingsFromTransactions).mockReturnValueOnce([
        { id: "h1", ticker: "AAPL", name: "Apple", shares: 10, purchasePrice: 100, displayCurrency: "USD", exchange: "", isin: "", valueInEUR: 0 } as never,
      ]);

      const result = await holdings.listHoldings("user-1");

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("SELECT id, name, ticker"),
        args: ["user-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("SELECT COUNT(*)"),
        args: ["user-1"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ ticker: "AAPL", shares: 10 });
    });

    it("returns empty array when neither holdings nor transactions exist", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const result = await holdings.listHoldings("user-1");

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [holdingRow({ id: "h1", ticker: "AAPL", portfolio_id: "portfolio-1" })],
      });

      const result = await holdings.listHoldings("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("AND portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
      expect(result).toHaveLength(1);
    });

    it("sorts results by name", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          holdingRow({ id: "h2", ticker: "MSFT", name: "Microsoft" }),
          holdingRow({ id: "h1", ticker: "AAPL", name: "Apple Inc" }),
        ],
      });

      const result = await holdings.listHoldings("user-1");

      expect(result[0].name).toBe("Apple Inc");
      expect(result[1].name).toBe("Microsoft");
    });

    it("returns empty from rebuildHoldings when deriveHoldingsFromTransactions returns empty", async () => {
      const { listTransactions } = await import("./transactions");

      vi.mocked(listTransactions).mockResolvedValueOnce([{ id: "tx1", ticker: "AAPL" } as never]);
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

      const result = await holdings.listHoldings("user-1");

      expect(result).toEqual([]);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("SELECT COUNT(*)"),
        args: ["user-1"],
      });
    });
  });

  describe("countHoldings", () => {
    it("returns count from holdings table", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: 7 }] });

      const result = await holdings.countHoldings("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("SELECT COUNT(*)"),
        args: ["user-1"],
      });
      expect(result).toBe(7);
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });

      const result = await holdings.countHoldings("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("AND portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
      expect(result).toBe(3);
    });

    it("returns 0 when no rows", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await holdings.countHoldings("user-1");

      expect(result).toBe(0);
    });
  });

  describe("addHolding", () => {
    it("inserts new holding when no existing match", async () => {
      const { resolvePortfolioId } = await import("./portfolios");

      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const holding = {
        name: "Apple Inc",
        ticker: "AAPL",
        isin: "US0378331005",
        assetType: "stock" as const,
        shares: 10,
        purchasePrice: 150,
        displayCurrency: "USD",
        exchange: "",
      };

      const result = await holdings.addHolding("user-1", holding);

      expect(resolvePortfolioId).toHaveBeenCalledWith("user-1", undefined);
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("SELECT id, shares, purchase_price"),
        args: ["user-1", "AAPL", "", "portfolio-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT INTO holdings"),
        args: expect.arrayContaining([
          "test-uuid-123",
          "user-1",
          "Apple Inc",
          "AAPL",
          "US0378331005",
          "stock",
          10,
          150,
          "USD",
          "",
        ]),
      });
      expect(result).toMatchObject({
        id: "test-uuid-123",
        ticker: "AAPL",
        shares: 10,
        purchasePrice: 150,
      });
    });

    it("updates existing holding with averaged price when ticker+exchange+portfolio match", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ id: "existing-h1", shares: 10, purchase_price: 100 }],
        })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const holding = {
        name: "Apple Inc",
        ticker: "AAPL",
        isin: "",
        shares: 5,
        purchasePrice: 120,
        displayCurrency: "USD",
        exchange: "",
      };

      const result = await holdings.addHolding("user-1", holding);

      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE holdings SET shares = ?, purchase_price = ?"),
        args: [15, 106.66666666666667, "existing-h1", "user-1"],
      });
      expect(result).toMatchObject({
        id: "existing-h1",
        shares: 15,
        purchasePrice: 106.66666666666667,
      });
    });

    it("uses portfolioId when provided", async () => {
      const { resolvePortfolioId } = await import("./portfolios");
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      await holdings.addHolding("user-1", {
        name: "Test",
        ticker: "TEST",
        isin: "",
        shares: 1,
        purchasePrice: 10,
        displayCurrency: "EUR",
        exchange: "",
      }, "portfolio-2");

      expect(resolvePortfolioId).toHaveBeenCalledWith("user-1", "portfolio-2");
    });
  });

  describe("updateHolding", () => {
    it("updates and returns holding when found", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [holdingRow({ id: "h1", name: "Apple", ticker: "AAPL", shares: 10, purchase_price: 100 })],
        })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await holdings.updateHolding("user-1", "h1", {
        name: "Apple Inc",
        shares: 15,
      });

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("SELECT id, name, ticker"),
        args: ["h1", "user-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE holdings"),
        args: expect.arrayContaining(["Apple Inc", 15, "h1", "user-1"]),
      });
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: "h1",
        name: "Apple Inc",
        shares: 15,
      });
    });

    it("returns null when holding not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await holdings.updateHolding("user-1", "nonexistent", { name: "Updated" });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe("removeHolding", () => {
    it("returns true when delete succeeds", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

      const result = await holdings.removeHolding("user-1", "h1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
        args: ["h1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when not found", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

      const result = await holdings.removeHolding("user-1", "nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("resetUserHoldings", () => {
    it("deletes holdings, cash, transactions and seeds when useSeedData is true", async () => {
      const { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } = await import("./seed");

      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 5 })
        .mockResolvedValueOnce({ rowsAffected: 2 })
        .mockResolvedValueOnce({ rowsAffected: 10 });

      const result = await holdings.resetUserHoldings("user-1", true);

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("DELETE FROM holdings"),
        args: ["user-1", "portfolio-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("DELETE FROM cash_entries"),
        args: ["user-1", "portfolio-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(3, {
        sql: expect.stringContaining("DELETE FROM transactions"),
        args: ["user-1", "portfolio-1"],
      });
      expect(seedHoldingsForUser).toHaveBeenCalledWith(mockClient, "user-1", "portfolio-1");
      expect(seedCashForUser).toHaveBeenCalledWith(mockClient, "user-1", "portfolio-1");
      expect(seedTransactionsForUser).toHaveBeenCalledWith(mockClient, "user-1", "portfolio-1");
      expect(result).toBe(17); // 5 + 2 + 10
    });

    it("deletes without seeding when useSeedData is false", async () => {
      const { seedHoldingsForUser } = await import("./seed");

      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 3 })
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rowsAffected: 8 });

      const result = await holdings.resetUserHoldings("user-1", false);

      expect(seedHoldingsForUser).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("uses portfolioId when provided", async () => {
      const { resolvePortfolioId } = await import("./portfolios");
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 });

      vi.mocked(resolvePortfolioId).mockResolvedValueOnce("portfolio-2");

      await holdings.resetUserHoldings("user-1", false, "portfolio-2");

      expect(resolvePortfolioId).toHaveBeenCalledWith("user-1", "portfolio-2");
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: expect.stringContaining("DELETE FROM holdings"),
        args: ["user-1", "portfolio-2"],
      });
    });
  });

  describe("deleteAllHoldings", () => {
    it("returns deleted count for user", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 12 });

      const result = await holdings.deleteAllHoldings("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("DELETE FROM holdings"),
        args: ["user-1"],
      });
      expect(result).toBe(12);
    });

    it("filters by portfolioId when provided", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 4 });

      const result = await holdings.deleteAllHoldings("user-1", "portfolio-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("AND portfolio_id = ?"),
        args: ["user-1", "portfolio-1"],
      });
      expect(result).toBe(4);
    });

    it("returns 0 when no rows affected", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });

      const result = await holdings.deleteAllHoldings("user-1");

      expect(result).toBe(0);
    });
  });
});
