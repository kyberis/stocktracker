import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  upsertHoldingsFromPositions,
  reconcileSnapTradeHoldingsAfterBulkImport,
} from "./holdings";

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

vi.mock("./portfolios", () => ({
  resolvePortfolioId: vi.fn().mockResolvedValue("portfolio-1"),
}));

vi.mock("./transactions", () => ({
  listTransactions: vi.fn(),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({ regularMarketPrice: 10, currency: "EUR" }),
    getExchangeRate: vi.fn().mockResolvedValue(1),
  })),
}));

vi.mock("@/lib/utils", () => ({
  convertToEUR: vi.fn((val: number) => val),
  resolveQuoteCurrency: vi.fn((_display: string, quote: string) => quote || "EUR"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertHoldingsFromPositions stale cleanup", () => {
  it("deletes snaptrade holdings when broker returns zero stock positions", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          {
            id: "h-sold",
            ticker: "ASML.AS",
            exchange: "AMS",
            name: "ASML",
            isin: "",
            asset_type: "stock",
            sector: "",
            region: "",
            asset_class: "",
            account_id: "",
            source: "snaptrade",
            value_in_eur: 1000,
            figi_share_class: "",
            tags: "[]",
          },
        ],
      })
      .mockResolvedValueOnce({ rowsAffected: 1 }); // DELETE

    await upsertHoldingsFromPositions("user-1", [], "portfolio-1");

    expect(mockExecute).toHaveBeenCalledWith({
      sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
      args: ["h-sold", "user-1"],
    });
  });
});

describe("reconcileSnapTradeHoldingsAfterBulkImport", () => {
  it("reduces a stale snaptrade holding when a new sell explains the gap", async () => {
    const { listTransactions } = await import("./transactions");
    vi.mocked(listTransactions).mockResolvedValueOnce([
      {
        id: "tx-buy",
        ticker: "ASML.AS",
        exchange: "AMS",
        type: "buy",
        shares: 10,
        totalAmount: 7000,
        fees: 0,
        taxes: 0,
        date: "2026-01-01",
        createdAt: "2026-01-01T00:00:00.000Z",
        name: "ASML",
        pricePerShare: 700,
        currency: "EUR",
        displayCurrency: "EUR",
        isin: "",
        assetType: "stock",
        accountId: "",
        holdingId: "",
        notes: "",
        sourceRef: "snaptrade-activity:buy",
      },
      {
        id: "tx-sell",
        ticker: "ASML.AS",
        exchange: "AMS",
        type: "sell",
        shares: 4,
        totalAmount: 3000,
        fees: 0,
        taxes: 0,
        date: "2026-08-20",
        createdAt: "2026-08-20T00:00:00.000Z",
        name: "ASML",
        pricePerShare: 750,
        currency: "EUR",
        displayCurrency: "EUR",
        isin: "",
        assetType: "stock",
        accountId: "",
        holdingId: "",
        notes: "",
        sourceRef: "snaptrade-activity:sell",
      },
    ] as never);

    mockExecute
      .mockResolvedValueOnce({
        rows: [
          {
            id: "h-asml",
            ticker: "ASML.AS",
            exchange: "AMS",
            shares: 10,
            purchase_price: 700,
            source: "snaptrade",
          },
        ],
      })
      .mockResolvedValueOnce({ rowsAffected: 1 }); // UPDATE shares 6

    const updated = await reconcileSnapTradeHoldingsAfterBulkImport(
      "user-1",
      [
        {
          ticker: "ASML.AS",
          exchange: "AMS",
          type: "sell",
          shares: 4,
          sourceRef: "snaptrade-activity:sell",
        },
      ],
      "portfolio-1",
    );

    expect(updated).toBe(1);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining("UPDATE holdings SET shares = ?"),
      args: expect.arrayContaining([6, "h-asml", "user-1"]),
    });
  });

  it("skips reconciliation when the sell gap exceeds newly imported sell size", async () => {
    const { listTransactions } = await import("./transactions");
    vi.mocked(listTransactions).mockResolvedValueOnce([
      {
        id: "tx-buy",
        ticker: "ASML.AS",
        exchange: "AMS",
        type: "buy",
        shares: 10,
        totalAmount: 7000,
        fees: 0,
        taxes: 0,
        date: "2026-01-01",
        createdAt: "2026-01-01T00:00:00.000Z",
        name: "ASML",
        pricePerShare: 700,
        currency: "EUR",
        displayCurrency: "EUR",
        isin: "",
        assetType: "stock",
        accountId: "",
        holdingId: "",
        notes: "",
        sourceRef: "snaptrade-activity:buy",
      },
    ] as never);

    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: "h-asml",
          ticker: "ASML.AS",
          exchange: "AMS",
          shares: 10,
          purchase_price: 700,
          source: "snaptrade",
        },
      ],
    });

    const updated = await reconcileSnapTradeHoldingsAfterBulkImport(
      "user-1",
      [
        {
          ticker: "ASML.AS",
          exchange: "AMS",
          type: "sell",
          shares: 2,
          sourceRef: "snaptrade-activity:sell",
        },
      ],
      "portfolio-1",
    );

    expect(updated).toBe(0);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
