import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSnapTradeBrokerSyncs,
  mockDetachSnapTradeHoldings,
  mockListSnapTradeTickersForBroker,
  mockRemoveCashEntriesBySourceAndBrokers,
  mockDeleteSnapTradeBrokerSync,
  mockRemoveBrokerPortfolioMappings,
  mockTrackEvent,
  mockListAccounts,
  mockFetchAllHoldings,
  mockRemoveBrokerageConnection,
} = vi.hoisted(() => ({
  mockGetSnapTradeBrokerSyncs: vi.fn(),
  mockDetachSnapTradeHoldings: vi.fn(),
  mockListSnapTradeTickersForBroker: vi.fn(),
  mockRemoveCashEntriesBySourceAndBrokers: vi.fn(),
  mockDeleteSnapTradeBrokerSync: vi.fn(),
  mockRemoveBrokerPortfolioMappings: vi.fn(),
  mockTrackEvent: vi.fn(),
  mockListAccounts: vi.fn(),
  mockFetchAllHoldings: vi.fn(),
  mockRemoveBrokerageConnection: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getSnapTradeBrokerSyncs: (...args: unknown[]) => mockGetSnapTradeBrokerSyncs(...args),
  detachSnapTradeHoldings: (...args: unknown[]) => mockDetachSnapTradeHoldings(...args),
  listSnapTradeTickersForBroker: (...args: unknown[]) => mockListSnapTradeTickersForBroker(...args),
  removeCashEntriesBySourceAndBrokers: (...args: unknown[]) =>
    mockRemoveCashEntriesBySourceAndBrokers(...args),
  deleteSnapTradeBrokerSync: (...args: unknown[]) => mockDeleteSnapTradeBrokerSync(...args),
  removeBrokerPortfolioMappings: (...args: unknown[]) => mockRemoveBrokerPortfolioMappings(...args),
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock("@/lib/snaptrade-client", () => ({
  listAccounts: (...args: unknown[]) => mockListAccounts(...args),
  fetchAllHoldings: (...args: unknown[]) => mockFetchAllHoldings(...args),
  removeBrokerageConnection: (...args: unknown[]) => mockRemoveBrokerageConnection(...args),
}));

import {
  disconnectSnapTradeBroker,
  resolveDisconnectBrokerTickers,
} from "./snaptrade-disconnect";

beforeEach(() => {
  vi.clearAllMocks();
  mockDetachSnapTradeHoldings.mockResolvedValue(1);
  mockRemoveCashEntriesBySourceAndBrokers.mockResolvedValue(1);
  mockDeleteSnapTradeBrokerSync.mockResolvedValue(true);
  mockRemoveBrokerPortfolioMappings.mockResolvedValue(undefined);
  mockRemoveBrokerageConnection.mockResolvedValue({ alreadyRemoved: false });
  mockListSnapTradeTickersForBroker.mockResolvedValue([]);
});

describe("resolveDisconnectBrokerTickers", () => {
  it("uses live positions for the brokerage authorization", async () => {
    mockListAccounts.mockResolvedValue([
      { id: "a1", name: "Degiro", institution: "DEGIRO", brokerageAuthorizationId: "auth-degiro" },
      { id: "a2", name: "IB", institution: "IBKR", brokerageAuthorizationId: "auth-ibkr" },
    ]);
    mockFetchAllHoldings.mockResolvedValue({
      holdings: [
        { ticker: "AAPL", shares: 1 },
        { ticker: "ITX.MC", shares: 2 },
      ],
      cashBalances: [],
      orderTransactions: [],
    });

    const tickers = await resolveDisconnectBrokerTickers({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-degiro",
      brokerageName: "DEGIRO",
    });

    expect(tickers.sort()).toEqual(["AAPL", "ITX.MC"]);
    expect(mockFetchAllHoldings).toHaveBeenCalledWith(
      "st1",
      "secret",
      new Set(["a1"]),
      expect.any(Map),
    );
    expect(mockListSnapTradeTickersForBroker).not.toHaveBeenCalled();
  });

  it("falls back to local transaction tickers when live positions are empty", async () => {
    mockListAccounts.mockResolvedValue([]);
    mockListSnapTradeTickersForBroker.mockResolvedValue(["UBER", "VZ"]);

    const tickers = await resolveDisconnectBrokerTickers({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-gone",
      brokerageName: "DEGIRO",
    });

    expect(tickers.sort()).toEqual(["UBER", "VZ"]);
  });
});

describe("disconnectSnapTradeBroker", () => {
  it("detaches only resolved tickers when other brokers remain", async () => {
    mockGetSnapTradeBrokerSyncs.mockResolvedValue([
      { brokerageAuthorizationId: "auth-degiro", brokerageName: "DEGIRO" },
      { brokerageAuthorizationId: "auth-ibkr", brokerageName: "Interactive Brokers" },
    ]);
    mockListAccounts.mockResolvedValue([
      { id: "a1", name: "D", institution: "DEGIRO", brokerageAuthorizationId: "auth-degiro" },
    ]);
    mockFetchAllHoldings.mockResolvedValue({
      holdings: [{ ticker: "ITX.MC", shares: 10 }],
      cashBalances: [],
      orderTransactions: [],
    });

    await disconnectSnapTradeBroker({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-degiro",
    });

    expect(mockDetachSnapTradeHoldings).toHaveBeenCalledWith("u1", undefined, {
      tickers: ["ITX.MC"],
    });
    expect(mockRemoveCashEntriesBySourceAndBrokers).toHaveBeenCalledWith("u1", "snaptrade", [
      "DEGIRO",
    ]);
    expect(mockRemoveBrokerageConnection).toHaveBeenCalledWith("st1", "secret", "auth-degiro");
    expect(mockDeleteSnapTradeBrokerSync).toHaveBeenCalledWith("u1", "auth-degiro");
    expect(mockTrackEvent).toHaveBeenCalledWith("u1", "snaptrade_disconnect_broker", {
      brokerConnectionId: "auth-degiro",
      brokerageName: "DEGIRO",
    });
  });

  it("detaches all snaptrade holdings when it is the sole broker and tickers are unknown", async () => {
    mockGetSnapTradeBrokerSyncs.mockResolvedValue([
      { brokerageAuthorizationId: "auth-degiro", brokerageName: "DEGIRO" },
    ]);
    mockListAccounts.mockResolvedValue([]);
    mockListSnapTradeTickersForBroker.mockResolvedValue([]);

    await disconnectSnapTradeBroker({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-degiro",
    });

    expect(mockDetachSnapTradeHoldings).toHaveBeenCalledWith("u1");
  });

  it("skips detach when other brokers remain and tickers cannot be resolved", async () => {
    mockGetSnapTradeBrokerSyncs.mockResolvedValue([
      { brokerageAuthorizationId: "auth-degiro", brokerageName: "DEGIRO" },
      { brokerageAuthorizationId: "auth-ibkr", brokerageName: "Interactive Brokers" },
    ]);
    mockListAccounts.mockResolvedValue([]);
    mockListSnapTradeTickersForBroker.mockResolvedValue([]);

    await disconnectSnapTradeBroker({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-degiro",
    });

    expect(mockDetachSnapTradeHoldings).not.toHaveBeenCalled();
    expect(mockRemoveBrokerageConnection).toHaveBeenCalled();
  });

  it("treats SnapTrade remove failure as non-fatal and still cleans local state", async () => {
    mockGetSnapTradeBrokerSyncs.mockResolvedValue([
      { brokerageAuthorizationId: "auth-degiro", brokerageName: "DEGIRO" },
    ]);
    mockListAccounts.mockResolvedValue([]);
    mockListSnapTradeTickersForBroker.mockResolvedValue(["AAPL"]);
    mockRemoveBrokerageConnection.mockRejectedValue(new Error("500"));

    await disconnectSnapTradeBroker({
      userId: "u1",
      snapTradeUserId: "st1",
      userSecret: "secret",
      brokerConnectionId: "auth-degiro",
    });

    expect(mockDeleteSnapTradeBrokerSync).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
