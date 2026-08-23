import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  listDistinctHoldingTickers: vi.fn(),
  listDistinctHoldingTickersForUser: vi.fn(),
  listUserIdsWithHoldings: vi.fn(),
  listHoldings: vi.fn(),
  listDistinctPortfolioIdsForUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/cron-quotes", () => ({
  fetchSharedQuotesAndRates: vi.fn(),
  shouldFetchLiveMarketData: vi.fn(),
}));

import { listDistinctHoldingTickers, listUserIdsWithHoldings } from "@/lib/db";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";
import { runPortfolioSnapshotsJob } from "./cron-portfolio-snapshots";

describe("runPortfolioSnapshotsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PORTFOLIO_SNAPSHOT_CRON_MAX_USERS;
  });

  it("skips Yahoo when no relevant market is open", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "AAPL",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "",
        assetType: "stock",
      },
    ]);
    vi.mocked(listUserIdsWithHoldings).mockResolvedValue(["user_1"]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(false);

    const result = await runPortfolioSnapshotsJob();

    expect(result.skippedMarketsClosed).toBe(true);
    expect(result.snapshots).toBe(0);
    expect(fetchSharedQuotesAndRates).not.toHaveBeenCalled();
  });

  it("loads shared quotes when a market is open", async () => {
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "AAPL",
        displayCurrency: "USD",
        exchange: "NYSE",
        figiShareClass: "",
        assetType: "stock",
      },
    ]);
    vi.mocked(listUserIdsWithHoldings).mockResolvedValue(["user_1"]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(true);
    vi.mocked(fetchSharedQuotesAndRates).mockResolvedValue({
      quotes: {},
      exchangeRates: {},
      quoteErrors: 1,
      uniqueTickers: 1,
    });

    const { listHoldings, listDistinctPortfolioIdsForUser } = await import("@/lib/db");
    vi.mocked(listHoldings).mockResolvedValue([]);
    vi.mocked(listDistinctPortfolioIdsForUser).mockResolvedValue([]);

    const result = await runPortfolioSnapshotsJob();

    expect(fetchSharedQuotesAndRates).toHaveBeenCalledWith({
      tickers: ["AAPL"],
      currencies: ["USD"],
    });
    expect(result.skippedMarketsClosed).toBeUndefined();
    expect(result.users).toBe(1);
    expect(result.quoteErrors).toBe(1);
  });
});
