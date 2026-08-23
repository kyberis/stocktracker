import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

vi.mock("@/lib/aid/can-access-aid-data", () => ({
  canAccessAidData: vi.fn(),
}));

vi.mock("@/lib/aid/build-status", () => ({
  buildAidStatus: vi.fn(),
}));

vi.mock("@/lib/db/aid-user-state", () => ({
  setLastAidVisitAt: vi.fn(),
}));

vi.mock("@/lib/holding-quotes", () => ({
  fetchQuoteMapForHoldings: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, listHoldings } from "@/lib/db";
import { canAccessAidData } from "@/lib/aid/can-access-aid-data";
import { buildAidStatus } from "@/lib/aid/build-status";
import { setLastAidVisitAt } from "@/lib/db/aid-user-state";
import { fetchQuoteMapForHoldings } from "@/lib/holding-quotes";
import { GET, POST } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedAccess = vi.mocked(canAccessAidData);
const mockedSettings = vi.mocked(getUserSettings);
const mockedHoldings = vi.mocked(listHoldings);
const mockedBuild = vi.mocked(buildAidStatus);
const mockedVisit = vi.mocked(setLastAidVisitAt);
const mockedQuotes = vi.mocked(fetchQuoteMapForHoldings);

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
  mockedQuotes.mockResolvedValue({
    AAPL: { symbol: "AAPL", regularMarketPrice: 100 },
  } as never);
  mockedBuild.mockResolvedValue({
    newCount: 3,
    caughtUp: false,
    breakdown: { finPulse: 1, digest: 1, earningsRecap: 0, alerts: 1 },
    briefing: null,
    marketSession: "open",
    warrenNudge: null,
  });
});

describe("GET /api/aid/status", () => {
  it("returns status without briefing by default", async () => {
    const res = await GET(new NextRequest("http://localhost/api/aid/status"));
    expect(res.status).toBe(200);
    expect(mockedBuild).toHaveBeenCalledWith(
      expect.objectContaining({ includeBriefing: false }),
    );
  });

  it("includes briefing when includeBriefing=1", async () => {
    mockedBuild.mockResolvedValueOnce({
      newCount: 3,
      caughtUp: false,
      breakdown: { finPulse: 1, digest: 1, earningsRecap: 0, alerts: 1 },
      briefing: "Test brief",
      marketSession: "open",
      warrenNudge: null,
    });
    const res = await GET(
      new NextRequest("http://localhost/api/aid/status?includeBriefing=1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.briefing).toBe("Test brief");
    expect(mockedBuild).toHaveBeenCalledWith(
      expect.objectContaining({ includeBriefing: true }),
    );
  });

  it("returns 403 when flag off", async () => {
    mockedAccess.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/aid/status"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/aid/status", () => {
  it("marks last visit", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/aid/status", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    expect(mockedVisit).toHaveBeenCalledWith("u1", expect.any(String));
  });
});
