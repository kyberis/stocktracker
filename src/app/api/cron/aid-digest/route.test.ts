import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/aid/warm-users", () => ({
  listAidWarmUserIds: vi.fn().mockResolvedValue(["u1"]),
}));

vi.mock("@/lib/db", () => ({
  getUserSettings: vi.fn().mockResolvedValue({ language: "en" }),
  listPortfolios: vi.fn().mockResolvedValue([{ id: "p1" }]),
  listHoldings: vi.fn().mockResolvedValue([{ ticker: "AAPL", shares: 1 }]),
  listAidNewsCacheForUser: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/aid/build-digest", () => ({
  buildAidDigest: vi.fn().mockResolvedValue({ items: [], earningsTodayCount: 0 }),
}));

vi.mock("@/lib/aid/build-earnings-recap", () => ({
  buildAidEarningsRecap: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn().mockResolvedValue({}),
}));

describe("GET /api/cron/aid-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/cron/aid-digest"));

    expect(res.status).toBe(401);
    expect(verifyCronAuth).toHaveBeenCalledWith("aid-digest", expect.any(NextRequest));
  });

  it("warms digest when cron auth passes", async () => {
    const { buildAidDigest } = await import("@/lib/aid/build-digest");
    const { GET } = await import("./route");

    const res = await GET(
      new NextRequest("http://localhost/api/cron/aid-digest", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ warmed: 1, skippedFresh: 0, candidates: 1 });
    expect(buildAidDigest).toHaveBeenCalledOnce();
  });
});
