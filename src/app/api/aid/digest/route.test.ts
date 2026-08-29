import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getUserSettings: vi.fn(),
  listHoldings: vi.fn(),
}));

vi.mock("@/lib/aid/can-access-aid-data", () => ({
  canAccessAidData: vi.fn(),
}));

vi.mock("@/lib/aid/build-digest", () => ({
  buildAidDigest: vi.fn(),
}));

vi.mock("@/lib/db/aid-user-state", () => ({
  getLastAidVisitAt: vi.fn(),
}));

vi.mock("@/lib/holding-quotes", () => ({
  fetchQuoteMapForHoldings: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, listHoldings } from "@/lib/db";
import { canAccessAidData } from "@/lib/aid/can-access-aid-data";
import { buildAidDigest } from "@/lib/aid/build-digest";
import { getLastAidVisitAt } from "@/lib/db/aid-user-state";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { GET } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedAccess = vi.mocked(canAccessAidData);
const mockedSettings = vi.mocked(getUserSettings);
const mockedHoldings = vi.mocked(listHoldings);
const mockedBuild = vi.mocked(buildAidDigest);
const mockedQuotes = vi.mocked(fetchQuoteMapForHoldings);
const mockedVisit = vi.mocked(getLastAidVisitAt);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: {
      userId: "u1",
      username: "u",
      email: "u@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "free",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
  mockedAccess.mockResolvedValue(true);
  mockedSettings.mockResolvedValue({ language: "en" } as never);
  mockedHoldings.mockResolvedValue([{ ticker: "AAPL", shares: 1 }] as never);
  mockedQuotes.mockResolvedValue({ AAPL: { regularMarketPrice: 100 } } as never);
  mockedVisit.mockResolvedValue(null);
  mockedBuild.mockResolvedValue({
    items: [{ id: "1", ticker: "AAPL" }],
    earningsTodayCount: 0,
    newSinceVisitCount: 0,
  } as never);
});

describe("GET /api/aid/digest", () => {
  it("returns 401 when session is missing", async () => {
    mockedSession.mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);

    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when aid data access is disabled", async () => {
    mockedAccess.mockResolvedValue(false);

    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(403);
  });

  it("returns digest items when authorized", async () => {
    const res = await GET(new NextRequest("http://localhost/api/aid/digest"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.earningsTodayCount).toBe(0);
    expect(mockedBuild).toHaveBeenCalledOnce();
    expect(mockedQuotes).toHaveBeenCalledOnce();
    expect(mockedVisit).toHaveBeenCalledWith("u1");
  });
});
