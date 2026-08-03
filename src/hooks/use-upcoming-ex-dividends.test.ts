// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUpcomingExDividends } from "./use-upcoming-ex-dividends";
import type { Holding } from "@/lib/types";

let fetchSpy: ReturnType<typeof vi.fn>;

function holding(ticker: string): Holding {
  return { ticker } as Holding;
}

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ events: [] }),
  });
  vi.stubGlobal("fetch", fetchSpy);
});

describe("useUpcomingExDividends (TRF-004-B / TRF-026)", () => {
  it("dedupes tickers before calling /api/ex-dividend", async () => {
    // Same holding bought in 3 separate lots — the exact shape that broke
    // /tools/events pre-fix by wasting the endpoint's 30-ticker cap on repeats.
    const holdings = [holding("AAPL"), holding("AAPL"), holding("MSFT"), holding("AAPL")];
    renderHook(() => useUpcomingExDividends(holdings));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    const tickersParam = new URL(calledUrl, "http://localhost").searchParams.get("tickers");
    expect(tickersParam?.split(",").sort()).toEqual(["AAPL", "MSFT"]);
  });

  it("does not fetch for an empty holdings list", () => {
    renderHook(() => useUpcomingExDividends([]));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the parsed events on success", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          events: [
            {
              symbol: "AAPL",
              exDividendDate: "2026-08-10",
              declarationDate: "",
              recordDate: "",
              paymentDate: "2026-08-20",
              amount: 0.25,
              currency: "USD",
            },
          ],
        }),
    });
    const { result } = renderHook(() => useUpcomingExDividends([holding("AAPL")]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].symbol).toBe("AAPL");
  });
});
