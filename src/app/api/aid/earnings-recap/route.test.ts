import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isFeatureEnabledForUser: vi.fn(),
  getUserSettings: vi.fn(),
  listHoldings: vi.fn(),
}));

vi.mock("@/lib/aid/build-earnings-recap", () => ({
  buildAidEarningsRecap: vi.fn(),
}));

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn().mockResolvedValue({}),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { GET } from "./route";

describe("GET /api/aid/earnings-recap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSession).mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ language: "en" } as never);
    vi.mocked(listHoldings).mockResolvedValue([{ ticker: "AAPL", valueInEUR: 100 }] as never);
    vi.mocked(buildAidEarningsRecap).mockResolvedValue({
      items: [
        {
          id: "1",
          ticker: "AAPL",
          movePct: 1,
          headline: "Beat on EPS",
          bullets: ["Revenue up"],
          impact: "medium",
          filterTags: ["earnings"],
          usedWeb: true,
          cachedAt: "2026-05-20T00:00:00.000Z",
          eventKey: "earnings:2026-05-20",
        },
      ],
    });
  });

  it("returns earnings recap items", async () => {
    const res = await GET(new NextRequest("http://localhost/api/aid/earnings-recap"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.lookbackDays).toBeGreaterThan(0);
  });
});
