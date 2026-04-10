// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImportAI } from "./useImportAI";

let fetchSpy: ReturnType<typeof vi.fn>;

/** Resolved by importAll after a successful bulk POST (triggers backfill fetch). */
const backfillOk = { ok: true };

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

describe("useImportAI", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useImportAI());
    expect(result.current.step).toBe("idle");
    expect(result.current.holdings).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.errorMsg).toBe("");
  });

  it("processFile moves to preview on success", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          holdings: [
            {
              ticker: "AAPL",
              name: "Apple",
              shares: 10,
              purchasePrice: 150,
              displayCurrency: "USD",
            },
          ],
          transactions: [],
        }),
    });

    const { result } = renderHook(() => useImportAI());
    const file = new File(["test"], "test.csv", { type: "text/csv" });
    await act(async () => {
      await result.current.processFile(file);
    });

    expect(result.current.step).toBe("preview");
    expect(result.current.holdings).toHaveLength(1);
  });

  it("processFile moves to error on 501", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 501,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useImportAI());
    const file = new File(["test"], "test.csv", { type: "text/csv" });
    await act(async () => {
      await result.current.processFile(file);
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toContain("OpenAI");
  });

  it("processFile moves to error when no data extracted", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ holdings: [], transactions: [] }),
    });

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(
        new File(["x"], "x.csv", { type: "text/csv" })
      );
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toContain("No data");
  });

  it("reset returns to idle", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          holdings: [
            {
              ticker: "X",
              name: "Y",
              shares: 1,
              purchasePrice: 1,
              displayCurrency: "EUR",
            },
          ],
          transactions: [],
        }),
    });

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(
        new File(["x"], "x.csv", { type: "text/csv" })
      );
    });
    expect(result.current.step).toBe("preview");
    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe("idle");
    expect(result.current.holdings).toEqual([]);
  });

  it("removeHolding removes by index", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          holdings: [
            {
              ticker: "A",
              name: "A",
              shares: 1,
              purchasePrice: 1,
              displayCurrency: "EUR",
            },
            {
              ticker: "B",
              name: "B",
              shares: 2,
              purchasePrice: 2,
              displayCurrency: "EUR",
            },
          ],
          transactions: [],
        }),
    });

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(
        new File(["x"], "x.csv", { type: "text/csv" })
      );
    });
    expect(result.current.holdings).toHaveLength(2);
    act(() => {
      result.current.removeHolding(0);
    });
    expect(result.current.holdings).toHaveLength(1);
    expect(result.current.holdings[0].ticker).toBe("B");
  });

  it("processFile moves to error on fetch rejection", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(
        new File(["x"], "x.csv", { type: "text/csv" })
      );
    });

    expect(result.current.step).toBe("error");
    expect(result.current.errorMsg).toBe("Network error");
  });
});

describe("useImportAI importAll", () => {
  it("importAll with holdings only converts to buy transactions and calls bulk API", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            holdings: [
              { ticker: "AAPL", name: "Apple", shares: 10, purchasePrice: 150, displayCurrency: "USD" },
            ],
            transactions: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
    });
    expect(result.current.step).toBe("preview");

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.step).toBe("done");
    expect(result.current.importedTxCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/transactions/bulk",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(3, "/api/portfolio/backfill-snapshots", { method: "POST" });
  });

  it("importAll with transactions uses existing transactions", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            holdings: [],
            transactions: [
              {
                date: "2024-01-15",
                type: "buy",
                ticker: "MSFT",
                name: "Microsoft",
                shares: 5,
                pricePerShare: 400,
                totalAmount: 2000,
                fees: 0,
                currency: "USD",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
    });
    expect(result.current.transactions).toHaveLength(1);

    await act(async () => {
      await result.current.importAll();
    });

    expect(result.current.step).toBe("done");
    const bulkBody = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(bulkBody.transactions[0].ticker).toBe("MSFT");
  });

  it("importAll when bulk API returns errors sets error state", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            holdings: [{ ticker: "X", name: "X", shares: 1, purchasePrice: 1, displayCurrency: "EUR" }],
            transactions: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
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
        status: 200,
        json: () =>
          Promise.resolve({
            holdings: [{ ticker: "X", name: "X", shares: 1, purchasePrice: 1, displayCurrency: "EUR" }],
            transactions: [],
          }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
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
        status: 200,
        json: () =>
          Promise.resolve({
            holdings: [{ ticker: "A", name: "A", shares: 1, purchasePrice: 1, displayCurrency: "EUR" }],
            transactions: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ inserted: 1, skipped: 0 }),
      })
      .mockResolvedValueOnce(backfillOk);

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
    });

    await act(async () => {
      await result.current.importAll("portfolio-123");
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/transactions/bulk?portfolioId=portfolio-123",
      expect.any(Object)
    );
  });

  it("removeTransaction removes by index", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          holdings: [],
          transactions: [
            { date: "2024-01-15", type: "buy", ticker: "A", name: "A", shares: 1, pricePerShare: 1, totalAmount: 1, fees: 0, currency: "EUR" },
            { date: "2024-01-16", type: "buy", ticker: "B", name: "B", shares: 2, pricePerShare: 2, totalAmount: 4, fees: 0, currency: "EUR" },
          ],
        }),
    });

    const { result } = renderHook(() => useImportAI());
    await act(async () => {
      await result.current.processFile(new File(["x"], "x.csv", { type: "text/csv" }));
    });
    expect(result.current.transactions).toHaveLength(2);

    act(() => {
      result.current.removeTransaction(0);
    });
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].ticker).toBe("B");
  });
});
