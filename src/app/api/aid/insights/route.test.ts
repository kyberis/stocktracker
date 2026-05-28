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
}));

vi.mock("@/lib/ai/office/office-identity", () => ({
  resolveOfficeIdentity: vi.fn(),
}));

vi.mock("@/lib/ai/office/clara-client", () => ({
  fetchClaraSavingsSummary: vi.fn(),
}));

vi.mock("@/lib/ai/office/will-client", () => ({
  fetchWillRecentTags: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { fetchWillRecentTags } from "@/lib/ai/office/will-client";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedIdentity = vi.mocked(resolveOfficeIdentity);
const mockedClara = vi.mocked(fetchClaraSavingsSummary);
const mockedWill = vi.mocked(fetchWillRecentTags);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: { userId: "u1", username: "u", email: "u@test.dev", role: "user", mustChangePassword: false, plan: "free", emailVerified: true, onboardingCompleted: true },
    error: null,
  } as never);
  mockedFlag.mockResolvedValue(true);
  mockedIdentity.mockResolvedValue({ idpSub: "sub", email: "u@test.dev", trefolioUserId: "u1" });
  mockedClara.mockResolvedValue({ available: true, freeInInvestingBucketEur: 500 });
  mockedWill.mockResolvedValue({
    available: true,
    tags: [{ label: "thesis", date: "2026-05-01" }],
    excerpt: "Thesis note",
  });
});

describe("GET /api/aid/insights", () => {
  it("returns 403 when aid_beta is disabled", async () => {
    mockedFlag.mockResolvedValueOnce(false);

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/aid/insights"));

    expect(res.status).toBe(403);
  });

  it("returns clara and will payloads when authorized", async () => {
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/aid/insights"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clara.freeInInvestingBucketEur).toBe(500);
    expect(body.will.tags[0].label).toBe("thesis");
    expect(mockedClara).toHaveBeenCalledOnce();
    expect(mockedWill).toHaveBeenCalledOnce();
  });
});
