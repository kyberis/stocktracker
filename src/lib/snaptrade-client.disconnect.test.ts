import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDeleteSnapTradeUser, mockRemoveBrokerageAuthorization } = vi.hoisted(() => ({
  mockDeleteSnapTradeUser: vi.fn(),
  mockRemoveBrokerageAuthorization: vi.fn(),
}));

vi.mock("snaptrade-typescript-sdk", () => ({
  Snaptrade: vi.fn().mockImplementation(() => ({
    authentication: {
      deleteSnapTradeUser: mockDeleteSnapTradeUser,
      registerSnapTradeUser: vi.fn(),
      loginSnapTradeUser: vi.fn(),
    },
    connections: {
      removeBrokerageAuthorization: mockRemoveBrokerageAuthorization,
      refreshBrokerageAuthorization: vi.fn(),
      listBrokerageAuthorizations: vi.fn(),
    },
    referenceData: { listAllBrokerages: vi.fn() },
    accountInformation: {
      listUserAccounts: vi.fn(),
      getAllUserHoldings: vi.fn(),
      getAccountActivities: vi.fn(),
    },
  })),
}));

vi.mock("@/lib/db/snaptrade-logs", () => ({
  insertSnapTradeLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/traffic/provider-track", () => ({
  trackExternalProvider: vi.fn(),
}));

describe("snaptrade-client disconnect idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.SNAPTRADE_CLIENT_ID = "cid";
    process.env.SNAPTRADE_CONSUMER_KEY = "key";
  });

  it("removeBrokerageConnection treats 404 as alreadyRemoved", async () => {
    mockRemoveBrokerageAuthorization.mockRejectedValueOnce(
      new Error("Request failed with status code 404"),
    );
    const { removeBrokerageConnection } = await import("./snaptrade-client");
    const result = await removeBrokerageConnection("u1", "secret", "auth-1");
    expect(result).toEqual({ alreadyRemoved: true });
  });

  it("deleteUser treats 404 as success", async () => {
    mockDeleteSnapTradeUser.mockRejectedValueOnce(
      new Error("Request failed with status code 404"),
    );
    const { deleteUser } = await import("./snaptrade-client");
    await expect(deleteUser("u1")).resolves.toBeUndefined();
  });
});
