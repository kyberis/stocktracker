import { beforeEach, describe, expect, it, vi } from "vitest";

const getQuote = vi.fn();

vi.mock("@/lib/db", () => ({
  listDistinctHoldingTickers: vi.fn(),
}));

vi.mock("@/lib/coverage-gaps", () => ({
  listCoverageGaps: vi.fn(),
  recordCoverageGaps: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: class {
    getQuote = getQuote;
  },
}));

vi.mock("@/lib/api-providers/isin-resolver", () => ({
  resolveIsinToTicker: vi.fn(async (_yahoo: unknown, symbol: string) => symbol),
}));

import { listDistinctHoldingTickers } from "@/lib/db";
import { listCoverageGaps, recordCoverageGaps } from "@/lib/coverage-gaps";
import { runCoverageReconcileJob } from "./cron-coverage-reconcile";

describe("runCoverageReconcileJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuote.mockResolvedValue({ regularMarketPrice: 10 });
  });

  it("only re-probes gaps recorded by refresh-holdings", async () => {
    vi.mocked(listCoverageGaps).mockResolvedValue(["ZZZZ"]);
    getQuote.mockResolvedValue({ regularMarketPrice: 0 });

    await expect(runCoverageReconcileJob()).resolves.toEqual({
      checked: 1,
      missing: 1,
      missingTickers: ["ZZZZ"],
      source: "refresh_holdings",
    });
    expect(listDistinctHoldingTickers).not.toHaveBeenCalled();
    expect(recordCoverageGaps).toHaveBeenCalledWith(["ZZZZ"]);
  });

  it("skips Yahoo when refresh-holdings recorded no gaps", async () => {
    vi.mocked(listCoverageGaps).mockResolvedValue([]);

    await expect(runCoverageReconcileJob()).resolves.toEqual({
      checked: 0,
      missing: 0,
      missingTickers: [],
      source: "refresh_holdings",
      skippedNoGaps: true,
    });
    expect(getQuote).not.toHaveBeenCalled();
  });

  it("falls back to all holdings when Redis is unavailable", async () => {
    vi.mocked(listCoverageGaps).mockResolvedValue(null);
    vi.mocked(listDistinctHoldingTickers).mockResolvedValue([
      {
        ticker: "AAPL",
        displayCurrency: "USD",
        exchange: "NMS",
        figiShareClass: "",
        assetType: "stock",
      },
    ]);

    await expect(runCoverageReconcileJob()).resolves.toEqual({
      checked: 1,
      missing: 0,
      missingTickers: [],
      source: "all_holdings",
    });
    expect(getQuote).toHaveBeenCalled();
    expect(recordCoverageGaps).toHaveBeenCalledWith([]);
  });
});
