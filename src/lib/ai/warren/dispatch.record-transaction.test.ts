import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listHoldings: vi.fn(),
  addTransaction: vi.fn(),
  removeHolding: vi.fn(),
  deleteTransactionsForPosition: vi.fn(),
  findUserById: vi.fn(),
  trackEvent: vi.fn(),
  insertAiLog: vi.fn().mockResolvedValue(undefined),
  addCashEntry: vi.fn(),
  addTransactionsBulk: vi.fn(),
  addWatchlistItem: vi.fn(),
  countActiveAlerts: vi.fn(),
  createAlert: vi.fn(),
  isFeatureEnabled: vi.fn(),
  rebuildHoldings: vi.fn(),
  removeCashEntriesBySource: vi.fn(),
}));

vi.mock("@/lib/db", () => dbMocks);
vi.mock("@/lib/subscription", () => ({
  getAlertLimit: () => 5,
  getHoldingsLimit: () => 50,
}));
vi.mock("@/lib/task-runner", () => ({ deferTask: (fn: () => void) => fn() }));
vi.mock("@/lib/backfill-snapshots", () => ({ runBackfillForUser: vi.fn() }));
vi.mock("@/lib/cron-portfolio-snapshots", () => ({
  materializeCurrentSnapshotsForUser: vi.fn(),
}));
vi.mock("@/lib/enrich-classifications", () => ({
  enrichHoldingClassifications: vi.fn().mockResolvedValue(undefined),
}));

import { dispatchProposal, recordTransactionDataSchema } from "./dispatch";

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.insertAiLog.mockResolvedValue(undefined);
  dbMocks.findUserById.mockResolvedValue({ plan: "pro" });
});

describe("recordTransactionDataSchema", () => {
  it("accepts a sell payload", () => {
    const parsed = recordTransactionDataSchema.safeParse({
      type: "sell",
      ticker: "NOW",
      shares: 15,
      pricePerShare: 144.76,
      fees: 6.45,
      currency: "USD",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects zero shares", () => {
    const parsed = recordTransactionDataSchema.safeParse({
      type: "sell",
      ticker: "NOW",
      shares: 0,
      pricePerShare: 100,
      currency: "USD",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("dispatchProposal recordTransaction", () => {
  it("records a sell against an existing holding", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h-now",
        ticker: "NOW",
        name: "ServiceNow",
        shares: 20,
        exchange: "",
        purchasePrice: 138.14,
      },
    ]);
    dbMocks.addTransaction.mockResolvedValueOnce({ id: "tx-1" });

    const result = await dispatchProposal("user-1", "recordTransaction", {
      type: "sell",
      ticker: "NOW",
      shares: 15,
      pricePerShare: 144.76,
      fees: 6.45,
      currency: "USD",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("Recorded sale");
      expect(result.entityId).toBe("tx-1");
    }
    expect(dbMocks.addTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        type: "sell",
        ticker: "NOW",
        shares: 15,
        holdingId: "h-now",
        fees: 6.45,
      }),
      undefined,
    );
  });

  it("rejects sell when holding is missing", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([]);

    const result = await dispatchProposal("user-1", "recordTransaction", {
      type: "sell",
      ticker: "NOW",
      shares: 15,
      pricePerShare: 144.76,
      currency: "USD",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toMatch(/No holding found/i);
    }
    expect(dbMocks.addTransaction).not.toHaveBeenCalled();
  });

  it("rejects sell when shares exceed position", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      { id: "h-now", ticker: "NOW", name: "ServiceNow", shares: 5, exchange: "" },
    ]);

    const result = await dispatchProposal("user-1", "recordTransaction", {
      type: "sell",
      ticker: "NOW",
      shares: 15,
      pricePerShare: 144.76,
      currency: "USD",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/only hold 5/i);
    }
  });

  it("resolves sell by company name via matchHoldingsToQuery", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h-now",
        ticker: "NOW",
        name: "ServiceNow",
        shares: 20,
        exchange: "",
      },
    ]);
    dbMocks.addTransaction.mockResolvedValueOnce({ id: "tx-2" });

    const result = await dispatchProposal("user-1", "recordTransaction", {
      type: "sell",
      ticker: "ServiceNow",
      shares: 10,
      pricePerShare: 140,
      currency: "USD",
    });

    expect(result.ok).toBe(true);
    expect(dbMocks.addTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ ticker: "NOW", holdingId: "h-now" }),
      undefined,
    );
  });
});

describe("dispatchProposal removeHolding", () => {
  it("resolves by ticker when holdingId is stale", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      { id: "h-real", ticker: "NOW", name: "ServiceNow", shares: 15, exchange: "NMS" },
    ]);
    dbMocks.deleteTransactionsForPosition.mockResolvedValueOnce(3);
    dbMocks.removeHolding.mockResolvedValueOnce(true);

    const result = await dispatchProposal("user-1", "removeHolding", {
      holdingId: "stale-id",
      ticker: "NOW",
    });

    expect(result.ok).toBe(true);
    expect(dbMocks.deleteTransactionsForPosition).toHaveBeenCalledWith(
      "user-1",
      "NOW",
      "NMS",
      undefined,
    );
    expect(dbMocks.removeHolding).toHaveBeenCalledWith("user-1", "h-real");
  });

  it("returns Holding not found when neither id nor ticker match", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([]);

    const result = await dispatchProposal("user-1", "removeHolding", {
      holdingId: "missing",
      ticker: "NOW",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Holding not found.");
    }
  });
});
