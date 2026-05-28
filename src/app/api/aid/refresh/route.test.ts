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

vi.mock("@/lib/aid/build-earnings-recap", () => ({
  buildAidEarningsRecap: vi.fn(),
}));

vi.mock("@/lib/quote-cache", () => ({
  getQuotesWithCache: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { buildAidEarningsRecap } from "@/lib/aid/build-earnings-recap";
import { getQuotesWithCache } from "@/lib/quote-cache";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedSettings = vi.mocked(getUserSettings);
const mockedHoldings = vi.mocked(listHoldings);
const mockedBuild = vi.mocked(buildAidDigest);
const mockedEarningsRecap = vi.mocked(buildAidEarningsRecap);
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
  mockedBuild.mockResolvedValue({ items: [], earningsTodayCount: 1 });
  mockedEarningsRecap.mockResolvedValue({ items: [] });
});

describe("POST /api/aid/refresh", () => {
  it("returns 401 when session is missing", async () => {
    mockedSession.mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);

    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/aid/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: "AAPL" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when aid_beta is disabled", async () => {
    mockedFlag.mockResolvedValueOnce(false);

    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/aid/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: "AAPL" }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("forces refresh for ticker when authorized", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/aid/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: "aapl" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockedBuild).toHaveBeenCalledWith(
      expect.objectContaining({ forceRefreshTicker: "AAPL", maxGenerate: 2 }),
    );
  });
});
