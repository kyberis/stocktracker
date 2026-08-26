import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/db/snaptrade-connections", () => ({
  clearSnapTradeMarkReconciliation: vi.fn().mockResolvedValue(undefined),
  getSnapTradeMarkReconciliation: vi.fn(),
  saveSnapTradeMarkReconciliation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/quote-cache", () => ({
  getRatesWithCache: vi.fn().mockResolvedValue({}),
}));

import { createNotification, trackEvent } from "@/lib/db";
import {
  clearSnapTradeMarkReconciliation,
  getSnapTradeMarkReconciliation,
  saveSnapTradeMarkReconciliation,
} from "@/lib/db/snaptrade-connections";
import { reconcileSnapTradeMarksAndNotify } from "./snaptrade-mark-gap-notify";
import type { ExtractedHolding } from "@/hooks/import-types";
import type { Holding } from "@/lib/types";

const mockedCreate = vi.mocked(createNotification);
const mockedTrack = vi.mocked(trackEvent);
const mockedClear = vi.mocked(clearSnapTradeMarkReconciliation);
const mockedGet = vi.mocked(getSnapTradeMarkReconciliation);
const mockedSave = vi.mocked(saveSnapTradeMarkReconciliation);

const bitcPos: ExtractedHolding = {
  name: "Bitwise Bitcoin Strategy Optimum Roll ETF",
  ticker: "BITC",
  shares: 257,
  purchasePrice: 40,
  displayCurrency: "EUR",
  exchange: "NYSE",
  assetType: "etf",
  brokerPrice: 65.45,
};

const bitcHolding = {
  ticker: "BITC",
  valueInEUR: 257 * 40.66,
} as Holding;

beforeEach(() => {
  vi.clearAllMocks();
  mockedGet.mockResolvedValue(null);
});

describe("reconcileSnapTradeMarksAndNotify", () => {
  it("clears stored gaps when there are no positions", async () => {
    const result = await reconcileSnapTradeMarksAndNotify("u1", [], []);
    expect(result).toBeNull();
    expect(mockedClear).toHaveBeenCalledWith("u1");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("notifies on a new material mark gap", async () => {
    const result = await reconcileSnapTradeMarksAndNotify("u1", [bitcPos], [bitcHolding]);
    expect(result?.gaps).toHaveLength(1);
    expect(result?.gaps[0].ticker).toBe("BITC");
    expect(mockedSave).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ notify: true, fingerprint: "BITC" }),
    );
    expect(mockedCreate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        title: "i18n:notifBrokerMarkGapTitle",
        link: "/",
      }),
    );
    expect(mockedTrack).toHaveBeenCalledWith(
      "u1",
      "snaptrade_mark_gap_notified",
      expect.objectContaining({ tickers: "BITC" }),
    );
  });

  it("skips notify within 24h for the same ticker set", async () => {
    mockedGet.mockResolvedValue({
      json: "{}",
      at: "2026-08-26T10:00:00.000Z",
      lastFingerprint: "BITC",
      lastNotifiedAt: new Date().toISOString(),
    });
    await reconcileSnapTradeMarksAndNotify("u1", [bitcPos], [bitcHolding]);
    expect(mockedSave).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ notify: false, fingerprint: "BITC" }),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedTrack).toHaveBeenCalledWith(
      "u1",
      "snaptrade_mark_gap_detected",
      expect.any(Object),
    );
  });

  it("clears the snapshot when the gap disappears", async () => {
    const aligned: ExtractedHolding = { ...bitcPos, brokerPrice: 40.66 };
    await reconcileSnapTradeMarksAndNotify("u1", [aligned], [bitcHolding]);
    expect(mockedClear).toHaveBeenCalledWith("u1");
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
