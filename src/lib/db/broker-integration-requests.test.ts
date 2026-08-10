import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("req-uuid-1"),
}));

import {
  normalizeBrokerName,
  createBrokerIntegrationRequest,
  listBrokerIntegrationRequestGroupsForAdmin,
} from "./broker-integration-requests";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeBrokerName", () => {
  it("folds case and trims whitespace", () => {
    expect(normalizeBrokerName("Trade Republic")).toBe("trade republic");
    expect(normalizeBrokerName("TRADE REPUBLIC")).toBe("trade republic");
    expect(normalizeBrokerName("  trade Republic  ")).toBe("trade republic");
  });

  it("does not fold semantically different names (no fuzzy aliasing)", () => {
    expect(normalizeBrokerName("IBKR")).not.toBe(normalizeBrokerName("Interactive Brokers"));
  });
});

describe("createBrokerIntegrationRequest", () => {
  it("inserts both the raw and normalized broker name", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({
        rows: [
          {
            id: "req-uuid-1",
            user_id: "user-1",
            broker_name: "Trade Republic",
            note: "",
            status: "requested",
            created_at: "2026-01-01",
          },
        ],
      }); // getBrokerIntegrationRequestById

    await createBrokerIntegrationRequest({ userId: "user-1", brokerName: "  Trade Republic  " });

    const insertCall = mockExecute.mock.calls[0][0];
    expect(insertCall.sql).toContain("broker_name_normalized");
    expect(insertCall.args).toEqual(["req-uuid-1", "user-1", "Trade Republic", "trade republic", ""]);
  });
});

describe("listBrokerIntegrationRequestGroupsForAdmin", () => {
  it("returns one group per normalized name with variants, count, and per-status breakdown", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ c: 2 }] }) // COUNT(DISTINCT ...)
      .mockResolvedValueOnce({
        rows: [
          {
            broker_name_normalized: "trade republic",
            variants: "Trade Republic,trade republic,TRADE REPUBLIC",
            total: 3,
            earliest: "2026-01-01 00:00:00",
            latest: "2026-03-01 00:00:00",
            display_name: "TRADE REPUBLIC",
            status_requested: 2,
            status_reviewing: 1,
            status_planned: 0,
            status_done: 0,
            status_rejected: 0,
          },
          {
            broker_name_normalized: "fortuneo",
            variants: "Fortuneo",
            total: 1,
            earliest: "2026-02-01 00:00:00",
            latest: "2026-02-01 00:00:00",
            display_name: "Fortuneo",
            status_requested: 1,
            status_reviewing: 0,
            status_planned: 0,
            status_done: 0,
            status_rejected: 0,
          },
        ],
      });

    const result = await listBrokerIntegrationRequestGroupsForAdmin(0, 25);

    expect(result.total).toBe(2);
    expect(result.entries).toHaveLength(2);

    const tradeRepublic = result.entries[0];
    expect(tradeRepublic.normalizedName).toBe("trade republic");
    expect(tradeRepublic.displayName).toBe("TRADE REPUBLIC");
    expect(tradeRepublic.variants).toEqual(["Trade Republic", "trade republic", "TRADE REPUBLIC"]);
    expect(tradeRepublic.count).toBe(3);
    expect(tradeRepublic.statusCounts).toEqual({
      requested: 2,
      reviewing: 1,
      planned: 0,
      done: 0,
      rejected: 0,
    });
    expect(tradeRepublic.earliestRequestedAt).toBe("2026-01-01 00:00:00");
    expect(tradeRepublic.latestRequestedAt).toBe("2026-03-01 00:00:00");

    // Ordered by count desc — the whole point of the fix.
    expect(result.entries[1].normalizedName).toBe("fortuneo");
  });

  it("groups by broker_name_normalized in the SQL, not raw broker_name", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ c: 0 }] }).mockResolvedValueOnce({ rows: [] });

    await listBrokerIntegrationRequestGroupsForAdmin(0, 25);

    const listCall = mockExecute.mock.calls[1][0];
    expect(listCall.sql).toContain("GROUP BY broker_name_normalized");
    expect(listCall.sql).toContain("ORDER BY total DESC");
  });
});
