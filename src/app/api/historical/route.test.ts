import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/api-providers/isin-resolver", () => ({
  resolveIsinToTicker: vi.fn(async (_yahoo: unknown, symbol: string) => symbol),
}));

const mockGetHistorical = vi.fn();

vi.mock("@/lib/api-providers/yahoo", () => ({
  YahooProvider: vi.fn().mockImplementation(() => ({
    getHistorical: mockGetHistorical,
  })),
}));

import { GET } from "./route";

describe("GET /api/historical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns historical data when yahoo succeeds", async () => {
    mockGetHistorical.mockResolvedValue([
      { date: "2026-08-24", open: 1, high: 2, low: 1, close: 2, volume: 10 },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/historical?symbol=AAPL&period=1m"),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: [{ date: "2026-08-24", open: 1, high: 2, low: 1, close: 2, volume: 10 }],
      providerUsed: "yahoo",
    });
  });

  it("degrades to empty data when yahoo throws validation errors", async () => {
    mockGetHistorical.mockRejectedValueOnce(
      new Error("The following result did not validate with schema"),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/historical?symbol=BAD&period=all"),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: [],
      providerUsed: "yahoo",
      degraded: true,
    });
  });
});
