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
}));

vi.mock("@/lib/homepage/build-home-bootstrap", () => ({
  buildHomeBootstrap: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { buildHomeBootstrap } from "@/lib/homepage/build-home-bootstrap";
import { GET } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedBootstrap = vi.mocked(buildHomeBootstrap);

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
  mockedFlag.mockResolvedValue(true);
  mockedBootstrap.mockResolvedValue({
    dayHighlights: { highlights: [], language: "en", asOf: "2026-08-23T00:00:00.000Z" },
    aidStatus: {
      newCount: 0,
      caughtUp: true,
      breakdown: { finPulse: 0, digest: 0, earningsRecap: 0, alerts: 0 },
      briefing: null,
      marketSession: "closed",
      warrenNudge: null,
    },
    recommendation: null,
    quotes: {},
    exchangeRates: {},
    quoteStats: { hitCount: 0, missCount: 0 },
    holdingsCount: 0,
    asOf: "2026-08-23T00:00:00.000Z",
  });
});

describe("GET /api/home-v2/bootstrap", () => {
  it("returns bootstrap payload when home_v2 enabled", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/home-v2/bootstrap?portfolioId=p1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aidStatus.briefing).toBeNull();
    expect(res.headers.get("Server-Timing")).toContain("quoteHits");
    expect(mockedBootstrap).toHaveBeenCalledWith({
      userId: "u1",
      portfolioId: "p1",
    });
  });

  it("returns 403 when flag off", async () => {
    mockedFlag.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/home-v2/bootstrap"));
    expect(res.status).toBe(403);
  });
});
