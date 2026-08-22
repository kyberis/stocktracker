// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImportBrokerCSV } from "./useImportBrokerCSV";
import {
  __resetLoginRedirectStateForTests,
  __setLoginRedirectNavigatorForTests,
} from "@/lib/auth/client-redirect";

let fetchSpy: ReturnType<typeof vi.fn>;
const navigateSpy = vi.fn();

const backfillOk = { ok: true };

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  __resetLoginRedirectStateForTests();
  __setLoginRedirectNavigatorForTests(navigateSpy);
  navigateSpy.mockReset();
  window.history.replaceState({}, "", "/import");
  // jsdom File lacks text(); stub it so parseFile can read CSV
  if (!File.prototype.text) {
    (File.prototype as unknown as { text: () => Promise<string> }).text =
      vi.fn().mockResolvedValue("date,ticker,shares\n2024-01-15,AAPL,10");
  }
});

afterEach(() => {
  __resetLoginRedirectStateForTests();
});

describe("useImportBrokerCSV", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useImportBrokerCSV());
    expect(result.current.step).toBe("idle");
    expect(result.current.transactions).toEqual([]);
    expect(result.current.holdings).toEqual([]);
    expect(result.current.errorMsg).toBe("");
  });

  it("parseFile success moves to preview with transactions", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          transactions: [
            {
              date: "2024-01-15",
              type: "buy",
              ticker: "AAPL",
              name: "Apple Inc",
              shares: 10,
              pricePerShare: 150,
              totalAmount: 1500,
              fees: 0,
              currency: "USD",
            },
          ],
          summary: { duplicatesRemoved: 0 },
        }),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    const file = new File(["date,ticker,shares"], "test.csv", {
      type: "text/csv",
    });
    await act(async () => {
      await result.current.parseFile(file, "degiro");
    });

    expect(result.current.step).toBe("preview");
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].ticker).toBe("AAPL");
  });

  it("parseFile error moves to error state", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    const file = new File(["invalid"], "test.csv", { type: "text/csv" });
    await act(async () => {
      await result.current.parseFile(file, "degiro");
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Server error");
  });

  it("parseFile 401 moves to error state with session expired message", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    const file = new File(["x"], "test.csv", { type: "text/csv" });
    await act(async () => {
      await result.current.parseFile(file, "degiro");
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toContain("Session expired");
    expect(navigateSpy).toHaveBeenCalledWith("/login?redirect=%2Fimport");
  });

  it("reset returns to idle", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          transactions: [
            {
              date: "2024-01-15",
              type: "buy",
              ticker: "AAPL",
              name: "Apple",
              shares: 1,
              pricePerShare: 150,
              totalAmount: 150,
              fees: 0,
              currency: "USD",
            },
          ],
          summary: { duplicatesRemoved: 0 },
        }),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["x"], "x.csv", { type: "text/csv" }),
        "degiro"
      );
    });
    expect(result.current.step).toBe("preview");
    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe("idle");
    expect(result.current.transactions).toEqual([]);
  });

  it("removeTransaction removes by index", async () => {
    fetchSpy.mockResolvedValueOnce({
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
          summary: { duplicatesRemoved: 0 },
        }),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["x"], "x.csv", { type: "text/csv" }),
        "degiro"
      );
    });
    expect(result.current.transactions).toHaveLength(2);
    act(() => {
      result.current.removeTransaction(0);
    });
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].ticker).toBe("B");
  });
});

describe("useImportBrokerCSV importAll", () => {
  it("importAll with transactions calls bulk API and moves to done", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "AAPL",
                name: "Apple Inc",
                shares: 10,
                pricePerShare: 150,
                totalAmount: 1500,
                fees: 0,
                currency: "USD",
              },
            ],
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["date,ticker,shares"], "test.csv", { type: "text/csv" }),
        "degiro"
      );
    });
    expect(result.current.step).toBe("preview");

    await act(async () => {
      await result.current.importAll("degiro");
    });

    expect(result.current.step).toBe("done");
    expect(result.current.importedTxCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const [, bulkInit] = fetchSpy.mock.calls[1]!;
    expect(bulkInit?.method).toBe("POST");
    expect(String(bulkInit?.body)).toContain('"transactions"');
    expect(new Headers(bulkInit?.headers).get("Content-Type")).toBe("application/json");
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      "/api/portfolio/backfill-snapshots",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("importAll when bulk API returns errors sets error state", async () => {
    fetchSpy
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
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["x"], "x.csv", { type: "text/csv" }),
        "degiro"
      );
    });

    await act(async () => {
      await result.current.importAll("degiro");
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
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["x"], "x.csv", { type: "text/csv" }),
        "degiro"
      );
    });

    await act(async () => {
      await result.current.importAll("degiro");
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
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(
        new File(["x"], "x.csv", { type: "text/csv" }),
        "degiro"
      );
    });

    await act(async () => {
      await result.current.importAll("degiro", false, "portfolio-456");
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/transactions/bulk?portfolioId=portfolio-456",
      expect.any(Object)
    );
  });

  it("importAll with holdingsCapped stops early", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              { date: "2024-01-15", type: "buy", ticker: "A", name: "A", shares: 1, pricePerShare: 1, totalAmount: 1, fees: 0, currency: "EUR" },
              { date: "2024-01-16", type: "buy", ticker: "B", name: "B", shares: 2, pricePerShare: 2, totalAmount: 4, fees: 0, currency: "EUR" },
            ],
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0, holdingsCapped: 3 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(new File(["x"], "x.csv", { type: "text/csv" }), "degiro");
    });
    await act(async () => {
      await result.current.importAll("degiro");
    });

    expect(result.current.holdingsCapped).toBe(3);
    expect(result.current.step).toBe("done");
  });

  it("parseFile with all duplicates shows error with count", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          transactions: [],
          summary: { duplicatesRemoved: 5 },
        }),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(new File(["x"], "x.csv", { type: "text/csv" }), "degiro");
    });
    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toContain("5 transactions");
  });

  it("parseFile 403 shows access denied", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(new File(["x"], "x.csv", { type: "text/csv" }), "degiro");
    });
    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toContain("Access denied");
  });

  it("parseFile network error moves to error state", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(new File(["x"], "x.csv", { type: "text/csv" }), "degiro");
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Network failure");
  });

  it("importAll with cash balances attempts cash import", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transactions: [
              { date: "2024-01-15", type: "buy", ticker: "AAPL", name: "Apple", shares: 10, pricePerShare: 150, totalAmount: 1500, fees: 0, currency: "USD" },
            ],
            cashBalances: [{ currency: "EUR", amount: 500 }],
            summary: { duplicatesRemoved: 0 },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ imported: 1 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportBrokerCSV());
    await act(async () => {
      await result.current.parseFile(new File(["csv data"], "test.csv", { type: "text/csv" }), "degiro");
    });

    await act(async () => {
      await result.current.importAll("degiro");
    });

    expect(result.current.step).toBe("done");
  });
});
