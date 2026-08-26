import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoginSnapTradeUser } = vi.hoisted(() => ({
  mockLoginSnapTradeUser: vi.fn(),
}));

vi.mock("snaptrade-typescript-sdk", () => ({
  Snaptrade: vi.fn().mockImplementation(() => ({
    authentication: {
      deleteSnapTradeUser: vi.fn(),
      registerSnapTradeUser: vi.fn(),
      loginSnapTradeUser: mockLoginSnapTradeUser,
    },
    connections: {
      removeBrokerageAuthorization: vi.fn(),
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

describe("generateConnectionPortalUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.SNAPTRADE_CLIENT_ID = "cid";
    process.env.SNAPTRADE_CONSUMER_KEY = "key";
    mockLoginSnapTradeUser.mockResolvedValue({
      data: { redirectURI: "https://connect.snaptrade.com/x", sessionId: "s1" },
    });
  });

  it("passes broker slug and immediateRedirect when broker is set", async () => {
    const { generateConnectionPortalUrl } = await import("./snaptrade-client");
    const result = await generateConnectionPortalUrl("u1", "secret", undefined, undefined, "ALPACA");
    expect(result.redirectUrl).toBe("https://connect.snaptrade.com/x");
    expect(mockLoginSnapTradeUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        userSecret: "secret",
        broker: "ALPACA",
        immediateRedirect: true,
      }),
    );
  });

  it("omits broker when not provided", async () => {
    const { generateConnectionPortalUrl } = await import("./snaptrade-client");
    await generateConnectionPortalUrl("u1", "secret");
    const arg = mockLoginSnapTradeUser.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.broker).toBeUndefined();
    expect(arg.immediateRedirect).toBeUndefined();
  });
});
