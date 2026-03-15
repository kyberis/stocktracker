// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSnapTradeApi } from "./useSnapTradeApi";

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  if (typeof window !== "undefined") {
    window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
  }
});

describe("useSnapTradeApi", () => {
  it("starts in idle with null connection", () => {
    const { result } = renderHook(() => useSnapTradeApi());
    expect(result.current.step).toBe("idle");
    expect(result.current.connection).toBeNull();
    expect(result.current.transactions).toEqual([]);
  });

  it("loadConnection fetches connection status", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          registered: true,
          redirectUri: "https://example.com",
          brokerageConnections: [],
          disabledConnections: [],
          brokerSyncs: [],
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });

    expect(result.current.connection).not.toBeNull();
    expect(result.current.connection?.registered).toBe(true);
  });

  it("loadConnection with no connection sets null", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });

    expect(result.current.connection).toBeNull();
  });

  it("reset returns to idle", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          registered: true,
          brokerageConnections: [],
          disabledConnections: [],
          brokerSyncs: [],
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    expect(result.current.connection).not.toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe("idle");
    expect(result.current.transactions).toEqual([]);
  });

  it("removeTransaction removes by index", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "A",
                name: "A",
                shares: 1,
                pricePerShare: 1,
                totalAmount: 1,
                fees: 0,
                currency: "EUR",
              },
              {
                date: "2024-01-16",
                type: "buy",
                ticker: "B",
                name: "B",
                shares: 2,
                pricePerShare: 2,
                totalAmount: 4,
                fees: 0,
                currency: "EUR",
              },
            ],
          }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    expect(result.current.transactions).toHaveLength(2);
    act(() => {
      result.current.removeTransaction(0);
    });
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].ticker).toBe("B");
  });
});

describe("useSnapTradeApi importAll", () => {
  it("importAll with transactions calls bulk API and moves to done", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "AAPL",
                name: "Apple",
                shares: 10,
                pricePerShare: 150,
                totalAmount: 1500,
                fees: 0,
                currency: "USD",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });
    expect(result.current.step).toBe("preview");
    expect(result.current.transactions).toHaveLength(1);

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.step).toBe("done");
    expect(result.current.importedCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/api/transactions/bulk",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("importAll when bulk API returns errors sets error state", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "X",
                name: "X",
                shares: 1,
                pricePerShare: 1,
                totalAmount: 1,
                fees: 0,
                currency: "EUR",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Import failed.");
  });

  it("importAll when bulk API fetch throws increments errorCount", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "X",
                name: "X",
                shares: 1,
                pricePerShare: 1,
                totalAmount: 1,
                fees: 0,
                currency: "EUR",
              },
            ],
          }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.importProgress.errors).toBe(1);
  });

  it("importAll with portfolioId includes it in URL", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "A",
                name: "A",
                shares: 1,
                pricePerShare: 1,
                totalAmount: 1,
                fees: 0,
                currency: "EUR",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    await act(async () => {
      await result.current.importAll("portfolio-789");
    });

    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/api/transactions/bulk?portfolioId=portfolio-789",
      expect.any(Object)
    );
  });

  it("importAll with holdingsCapped sets holdingsCapped and stops early", async () => {
    const txs = Array.from({ length: 60 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      type: "buy",
      ticker: `T${i}`,
      name: `T${i}`,
      shares: 1,
      pricePerShare: 1,
      totalAmount: 1,
      fees: 0,
      currency: "EUR",
    }));
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transactions: txs }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 50, skipped: 0, holdingsCapped: 5 }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.holdingsCapped).toBe(5);
    expect(result.current.step).toBe("done");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("importAll filters out transactions without date", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            registered: true,
            brokerageConnections: [],
            disabledConnections: [],
            brokerSyncs: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              { date: "", type: "buy", ticker: "X", name: "X", shares: 1, pricePerShare: 1, totalAmount: 1, fees: 0, currency: "EUR" },
              { date: "2024-01-15", type: "buy", ticker: "A", name: "A", shares: 1, pricePerShare: 1, totalAmount: 1, fees: 0, currency: "EUR" },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.importedCount).toBe(1);
    expect(result.current.step).toBe("done");
  });
});

describe("useSnapTradeApi connect", () => {
  it("connect when register fails sets error and step", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Registration failed" }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Registration failed");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("connect when connect-url fails sets error and step", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to get URL" }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Failed to get URL");
  });

  it("connect when fetch throws sets error and step", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Failed to connect to SnapTrade.");
  });

  it("connect sends register-user then connect-url FormData", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "URL error" }),
      });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.connect();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall[1]?.body).toBeInstanceOf(FormData);
    const firstForm = firstCall[1]?.body as FormData;
    expect(firstForm.get("action")).toBe("register-user");

    const secondCall = fetchSpy.mock.calls[1];
    const secondForm = secondCall[1]?.body as FormData;
    expect(secondForm.get("action")).toBe("connect-url");
  });
});

describe("useSnapTradeApi reconnect", () => {
  it("reconnect when fetch fails sets error and step", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Reconnect failed" }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.reconnect("conn-123");
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Reconnect failed");
  });

  it("reconnect when fetch throws sets error and step", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.reconnect("conn-456");
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Failed to reconnect to SnapTrade.");
  });

  it("reconnect sends reconnect-url with connectionId in FormData", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "err" }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.reconnect("my-connection-id");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0];
    const form = callArgs[1]?.body as FormData;
    expect(form.get("action")).toBe("reconnect-url");
    expect(form.get("connectionId")).toBe("my-connection-id");
  });
});

describe("useSnapTradeApi fetchPortfolio", () => {
  it("fetchPortfolio success sets transactions and step to preview", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          transactions: [
            {
              date: "2024-02-01",
              type: "buy",
              ticker: "msft",
              name: "Microsoft",
              shares: 5,
              pricePerShare: 300,
              totalAmount: 1500,
              fees: 5,
              currency: "USD",
            },
          ],
          summary: { total: 1, duplicatesRemoved: 0 },
          syncTriggered: true,
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    expect(result.current.step).toBe("preview");
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].ticker).toBe("MSFT");
    expect(result.current.lastFetchSummary).toEqual({ total: 1, duplicatesRemoved: 0 });
    expect(result.current.lastFetchSyncTriggered).toBe(true);
  });

  it("fetchPortfolio when res not ok sets error and step", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Fetch failed" }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Fetch failed");
  });

  it("fetchPortfolio when res not ok with needsReconnect sets disabledConnections", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "Broker disconnected",
          needsReconnect: true,
          disabledConnections: [{ id: "c1", brokerageName: "Broker", disabledDate: "2024-01-01" }],
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    expect(result.current.needsReconnect).toBe(true);
    expect(result.current.disabledConnections).toHaveLength(1);
    expect(result.current.disabledConnections[0].id).toBe("c1");
  });

  it("fetchPortfolio when fetch throws sets error and step", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.fetchPortfolio();
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Failed to fetch portfolio.");
  });

  it("fetchPortfolio sends portfolioId, startDate, brokerStartDates in FormData", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ transactions: [] }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.fetchPortfolio("port-1", "2024-01-01", { broker1: "2024-02-01" });
    });

    const form = fetchSpy.mock.calls[0][1]?.body as FormData;
    expect(form.get("action")).toBe("fetch");
    expect(form.get("portfolioId")).toBe("port-1");
    expect(form.get("startDate")).toBe("2024-01-01");
    expect(form.get("brokerStartDates")).toBe(JSON.stringify({ broker1: "2024-02-01" }));
  });
});

describe("useSnapTradeApi resync", () => {
  it("resync calls fetchPortfolio", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ transactions: [], summary: null }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.resync();
    });

    expect(result.current.step).toBe("preview");
    expect(fetchSpy).toHaveBeenCalledWith("/api/snaptrade", expect.objectContaining({ method: "POST" }));
  });
});

describe("useSnapTradeApi disconnect", () => {
  it("disconnect on success clears connection and transactions", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            connected: true,
            brokerageConnections: [{ id: "c1", brokerageName: "B", disabled: false, disabledDate: null }],
            brokerSyncs: [],
            disabledConnections: [],
          }),
      })
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    expect(result.current.connection).not.toBeNull();

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.connection).toEqual({ connected: false });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.step).toBe("idle");

    const form = fetchSpy.mock.calls[1][1]?.body as FormData;
    expect(form.get("action")).toBe("disconnect");
  });

  it("disconnect when fetch throws ignores error and leaves state unchanged", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnapTradeApi());
    expect(result.current.connection).toBeNull();

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.connection).toBeNull();
    expect(result.current.step).toBe("idle");
  });
});

describe("useSnapTradeApi disconnectBroker", () => {
  it("disconnectBroker on success removes broker from state", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            connected: true,
            brokerageConnections: [
              { id: "b1", brokerageName: "Broker1", disabled: false, disabledDate: null },
              { id: "b2", brokerageName: "Broker2", disabled: false, disabledDate: null },
            ],
            brokerSyncs: [
              { brokerageAuthorizationId: "b1", brokerageName: "Broker1", lastImportedAt: "" },
              { brokerageAuthorizationId: "b2", brokerageName: "Broker2", lastImportedAt: "" },
            ],
            disabledConnections: [],
            activeBrokerCount: 2,
          }),
      })
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    expect(result.current.activeBrokerCount).toBe(2);

    await act(async () => {
      await result.current.disconnectBroker("b1");
    });

    expect(result.current.mergedBrokers).toHaveLength(1);
    expect(result.current.activeBrokerCount).toBe(1);

    const form = fetchSpy.mock.calls[1][1]?.body as FormData;
    expect(form.get("action")).toBe("disconnect-broker");
    expect(form.get("brokerConnectionId")).toBe("b1");
  });

  it("disconnectBroker when res not ok does not update state", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            connected: true,
            brokerageConnections: [{ id: "b1", brokerageName: "B", disabled: false, disabledDate: null }],
            brokerSyncs: [],
            disabledConnections: [],
            activeBrokerCount: 1,
          }),
      })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });
    const countBefore = result.current.activeBrokerCount;

    await act(async () => {
      await result.current.disconnectBroker("b1");
    });

    expect(result.current.activeBrokerCount).toBe(countBefore);
  });
});

describe("useSnapTradeApi mergedBrokers", () => {
  it("mergedBrokers merges brokerageConnections with brokerSyncs", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          connected: true,
          brokerageConnections: [
            { id: "conn-1", brokerageName: "Broker A", disabled: false, disabledDate: null },
          ],
          brokerSyncs: [
            {
              brokerageAuthorizationId: "conn-1",
              brokerageName: "Broker A",
              lastImportedAt: "2024-01-15",
              connectedAt: "2024-01-01",
              transactionCount: 10,
            },
          ],
          disabledConnections: [],
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });

    expect(result.current.mergedBrokers).toHaveLength(1);
    expect(result.current.mergedBrokers[0].brokerageAuthorizationId).toBe("conn-1");
    expect(result.current.mergedBrokers[0].brokerageName).toBe("Broker A");
    expect(result.current.mergedBrokers[0].lastImportedAt).toBe("2024-01-15");
    expect(result.current.mergedBrokers[0].hasSyncRecord).toBe(true);
  });

  it("mergedBrokers includes sync-only entries when not in connections", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          connected: true,
          brokerageConnections: [],
          brokerSyncs: [
            {
              brokerageAuthorizationId: "orphan-sync",
              brokerageName: "Orphan Broker",
              lastImportedAt: "2024-01-10",
            },
          ],
          disabledConnections: [],
        }),
    });

    const { result } = renderHook(() => useSnapTradeApi());
    await act(async () => {
      await result.current.loadConnection();
    });

    expect(result.current.mergedBrokers).toHaveLength(1);
    expect(result.current.mergedBrokers[0].brokerageAuthorizationId).toBe("orphan-sync");
    expect(result.current.mergedBrokers[0].brokerageName).toBe("Orphan Broker");
    expect(result.current.mergedBrokers[0].hasSyncRecord).toBe(true);
  });
});
