import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isFeatureEnabledForUser: vi.fn(),
  getUserSettings: vi.fn(),
  listHoldings: vi.fn(),
}));

vi.mock("@/lib/aid/build-digest", () => ({
  buildAidDigest: vi.fn(),
}));

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { getQuotesWithCache } from "@/lib/quote-cache";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedSettings = vi.mocked(getUserSettings);
const mockedHoldings = vi.mocked(listHoldings);
const mockedBuild = vi.mocked(buildAidDigest);
const mockedQuotes = vi.mocked(getQuotesWithCache);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: { userId: "u1", username: "u", email: "u@test.dev", role: "user", mustChangePassword: false, plan: "free", emailVerified: true, onboardingCompleted: true },
    error: null,
  } as never);
  mockedFlag.mockResolvedValue(true);
  mockedSettings.mockResolvedValue({ language: "en" } as never);
  mockedHoldings.mockResolvedValue([{ ticker: "AAPL", shares: 1 }] as never);
  mockedQuotes.mockResolvedValue({ AAPL: { regularMarketPrice: 100 } } as never);
  mockedBuild.mockResolvedValue({
    items: [
      {
        id: "1",
        ticker: "AAPL",
        movePct: 1,
        headline: "Test",
        bullets: ["a"],
        impact: "medium",
        impactScore: 3,
        filterTags: ["move"],
        usedWeb: false,
        cachedAt: "2026-05-20T00:00:00.000Z",
        eventKey: "test",
      },
    ],
    earningsTodayCount: 0,
    newSinceVisitCount: 0,
  });
});

describe("GET /api/aid/digest", () => {
  it("returns 401 when session is missing", async () => {
    mockedSession.mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when aid_beta is disabled", async () => {
    mockedFlag.mockResolvedValueOnce(false);

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(403);
  });

  it("returns digest items when authorized", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.earningsTodayCount).toBe(0);
    expect(mockedBuild).toHaveBeenCalledOnce();
  });
});
