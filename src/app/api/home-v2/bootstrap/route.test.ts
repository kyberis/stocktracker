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
  buildHomeBootstrapCore: vi.fn(),
  buildHomeBootstrapSections: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import {
  buildHomeBootstrap,
  buildHomeBootstrapCore,
  buildHomeBootstrapSections,
} from "@/lib/homepage/build-home-bootstrap";
import { GET } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedBootstrap = vi.mocked(buildHomeBootstrap);
const mockedCore = vi.mocked(buildHomeBootstrapCore);
const mockedSections = vi.mocked(buildHomeBootstrapSections);

const corePayload = {
  holdings: [],
  cashEntries: [],
  quotes: { AAPL: { regularMarketPrice: 1 } },
  exchangeRates: {},
  quoteStats: { hitCount: 2, missCount: 1 },
  holdingsCount: 1,
  asOf: "2026-08-23T00:00:00.000Z",
};

const sectionsPayload = {
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
};

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
  mockedBootstrap.mockResolvedValue({ ...corePayload, ...sectionsPayload } as never);
  mockedCore.mockResolvedValue(corePayload as never);
  mockedSections.mockResolvedValue(sectionsPayload as never);
});

describe("GET /api/home-v2/bootstrap", () => {
  it("returns full bootstrap payload by default", async () => {
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

  it("returns core payload when phase=core", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/home-v2/bootstrap?phase=core&portfolioId=p1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.holdings).toEqual([]);
    expect(data.quotes.AAPL?.regularMarketPrice).toBe(1);
    expect(mockedCore).toHaveBeenCalledWith({ userId: "u1", portfolioId: "p1" });
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  it("returns sections payload when phase=sections", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/home-v2/bootstrap?phase=sections&portfolioId=p1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dayHighlights).toBeDefined();
    expect(mockedSections).toHaveBeenCalledWith({ userId: "u1", portfolioId: "p1" });
  });

  it("returns 403 when flag off", async () => {
    mockedFlag.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/home-v2/bootstrap"));
    expect(res.status).toBe(403);
  });
});
