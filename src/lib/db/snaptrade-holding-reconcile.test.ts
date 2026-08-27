import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  upsertHoldingsFromPositions,
  reconcileSnapTradeHoldingsAfterBulkImport,
  persistHoldingIsin,
  reenrichHoldingsValueInEUR,
} from "./holdings";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

import { marketDataSymbolForHolding } from "@/lib/market-symbol";

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
    search: vi.fn().mockResolvedValue([{ symbol: "GB00BLD4ZL17.SG" }]),
    getQuote: vi.fn().mockResolvedValue({ regularMarketPrice: 10, currency: "EUR" }),
    getExchangeRate: vi.fn().mockResolvedValue(1),
  })),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    convertToEUR: vi.fn((val: number) => val),
    resolveQuoteCurrency: vi.fn((_display: string, quote: string) => quote || "EUR"),
    hasExchangeRate: vi.fn(() => true),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertHoldingsFromPositions stale cleanup", () => {
  it("does not wipe snaptrade holdings when broker transiently returns zero positions", async () => {
    mockExecute.mockResolvedValueOnce({
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
    });

    await upsertHoldingsFromPositions("user-1", [], "portfolio-1");

    expect(mockExecute).toHaveBeenCalledTimes(1); // SELECT only — no DELETE
    expect(mockExecute).not.toHaveBeenCalledWith({
      sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
      args: ["h-sold", "user-1"],
    });
  });

  it("removes stale snaptrade tickers when a non-empty snapshot omits them", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          {
            id: "h-kept",
            ticker: "O",
            exchange: "NYSE",
            name: "Realty Income",
            isin: "",
            asset_type: "stock",
            sector: "",
            region: "",
            asset_class: "",
            account_id: "",
            source: "snaptrade",
            value_in_eur: 2000,
            figi_share_class: "",
            tags: "[]",
          },
          {
            id: "h-stale",
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
      .mockResolvedValueOnce({ rowsAffected: 1 }) // UPDATE kept
      .mockResolvedValueOnce({ rowsAffected: 1 }) // DELETE stale
      .mockResolvedValueOnce({ rowsAffected: 1 }); // value_in_eur update

    await upsertHoldingsFromPositions(
      "user-1",
      [
        {
          name: "Realty Income",
          ticker: "O",
          shares: 49,
          purchasePrice: 50,
          displayCurrency: "USD",
          exchange: "NYSE",
          assetType: "stock",
        },
      ],
      "portfolio-1",
    );

    expect(mockExecute).toHaveBeenCalledWith({
      sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
      args: ["h-stale", "user-1"],
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

const bitcExistingRow = {
  id: "h-bitc",
  ticker: "BITC",
  exchange: "ARCX",
  name: "Bitwise Trendwise",
  isin: "GB00BLD4ZL17",
  asset_type: "etf",
  sector: "",
  region: "",
  asset_class: "",
  account_id: "",
  source: "snaptrade",
  value_in_eur: 16000,
  figi_share_class: "BBG01FZQP6S8",
  tags: "[]",
  purchase_price: 40,
};

const incomingBitc = {
  name: "Bitwise Trendwise Bitcoin and Treasuries Rotation Strategy ETF",
  ticker: "BITC",
  shares: 257,
  purchasePrice: 0,
  displayCurrency: "USD",
  exchange: "ARCX",
  assetType: "etf",
  figiShareClass: "BBG01FZQP6S8",
  isin: "",
};

describe("upsertHoldingsFromPositions sticky namesake ISIN", () => {
  it("keeps a discovered non-US ISIN when SnapTrade omits it on the next sync", async () => {
    mockExecute.mockImplementation(async (q: { sql?: string }) => {
      if (String(q.sql || "").includes("SELECT id, ticker")) {
        return { rows: [bitcExistingRow] };
      }
      return { rows: [], rowsAffected: 1 };
    });

    const upserted = await upsertHoldingsFromPositions("user-1", [incomingBitc], "portfolio-1");
    expect(upserted[0].isin).toBe("GB00BLD4ZL17");
    expect(upserted[0].ticker).toBe("BITC");
    expect(marketDataSymbolForHolding(upserted[0])).toBe("GB00BLD4ZL17");

    const shareUpdate = mockExecute.mock.calls.find((c) =>
      String(c[0]?.sql || "").includes("isin = ?"),
    );
    expect(shareUpdate?.[0].args).toContain("GB00BLD4ZL17");
    expect(shareUpdate?.[0].args).toContain("BITC");
  });

  it("does not FIGI-unsuffix BITC.DE when a sticky non-US ISIN is already stored", async () => {
    mockExecute.mockImplementation(async (q: { sql?: string }) => {
      if (String(q.sql || "").includes("SELECT id, ticker")) {
        return {
          rows: [{ ...bitcExistingRow, ticker: "BITC.DE", exchange: "XET" }],
        };
      }
      return { rows: [], rowsAffected: 1 };
    });

    const upserted = await upsertHoldingsFromPositions("user-1", [incomingBitc], "portfolio-1");
    expect(upserted[0].ticker).toBe("BITC.DE");
    expect(upserted[0].isin).toBe("GB00BLD4ZL17");
    expect(upserted[0].exchange).toBe("XET");

    const rename = mockExecute.mock.calls.find((c) =>
      String(c[0]?.sql || "").startsWith("UPDATE holdings SET ticker = ?, exchange = ?"),
    );
    expect(rename).toBeUndefined();
  });

  it("persistHoldingIsin updates only the ISIN column", async () => {
    mockExecute.mockResolvedValue({ rows: [], rowsAffected: 1 });
    await persistHoldingIsin("user-1", "h-bitc", "GB00BLD4ZL17");
    expect(mockExecute).toHaveBeenCalledWith({
      sql: "UPDATE holdings SET isin = ? WHERE id = ? AND user_id = ?",
      args: ["GB00BLD4ZL17", "h-bitc", "user-1"],
    });
  });

  it("reenrichHoldingsValueInEUR writes quoted value_in_eur", async () => {
    mockExecute.mockResolvedValue({ rows: [], rowsAffected: 1 });
    const holding = {
      id: "h-bitc",
      name: "BITC",
      ticker: "BITC",
      isin: "GB00BLD4ZL17",
      assetType: "etf" as const,
      shares: 257,
      purchasePrice: 40,
      displayCurrency: "USD",
      exchange: "ARCX",
      valueInEUR: 0,
      tags: [],
    };
    await reenrichHoldingsValueInEUR("user-1", [holding]);
    expect(holding.valueInEUR).toBe(2570);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: "UPDATE holdings SET value_in_eur = ? WHERE id = ? AND user_id = ?",
      args: [2570, "h-bitc", "user-1"],
    });
  });
});
