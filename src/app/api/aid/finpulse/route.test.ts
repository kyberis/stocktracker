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

vi.mock("@/lib/aid/build-finpulse", () => ({
  buildFinPulseForUser: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, getUserSettings, listHoldings } from "@/lib/db";
import { buildFinPulseForUser } from "@/lib/aid/build-finpulse";
import { GET } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedSettings = vi.mocked(getUserSettings);
const mockedHoldings = vi.mocked(listHoldings);
const mockedBuild = vi.mocked(buildFinPulseForUser);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: { userId: "u1", username: "u", email: "u@test.dev", role: "user", mustChangePassword: false, plan: "free", emailVerified: true, onboardingCompleted: true },
    error: null,
  } as never);
  mockedFlag.mockResolvedValue(true);
  mockedSettings.mockResolvedValue({ language: "en" } as never);
  mockedHoldings.mockResolvedValue([{ ticker: "NVDA", shares: 1 }] as never);
  mockedBuild.mockResolvedValue({
    items: [{ id: "1", handle: "federalreserve", headline: "Test", bullets: ["a"], impact: "high" as const, tickers: [], tags: [], cachedAt: "", portfolioRelevant: false, displayName: "Fed", sourceUrl: "https://x.com", publishedAt: "" }],
    generated: 0,
  });
});

describe("GET /api/aid/finpulse", () => {
  it("returns finpulse items", async () => {
    const res = await GET(new NextRequest("http://localhost/api/aid/finpulse?tab=market_voices"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.tab).toBe("market_voices");
  });

  it("requests foryou tab", async () => {
    await GET(new NextRequest("http://localhost/api/aid/finpulse?tab=foryou"));
    expect(mockedBuild).toHaveBeenCalledWith(expect.objectContaining({ tab: "foryou" }));
  });
});
