import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getUserSettings: vi.fn(),
  isFeatureEnabledForUser: vi.fn(),
}));

vi.mock("@/lib/aid/build-feed", () => ({
  buildAidFeed: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, isFeatureEnabledForUser } from "@/lib/db";
import { buildAidFeed } from "@/lib/aid/build-feed";
import { GET } from "./route";

describe("GET /api/aid/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new NextRequest("http://localhost/api/aid/feed"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when aid_beta off", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: { userId: "u1", email: "a@b.com", role: "user" },
      error: null,
    } as never);
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/aid/feed"));
    expect(res.status).toBe(403);
  });

  it("returns priority feed", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: { userId: "u1", email: "a@b.com", role: "user" },
      error: null,
    } as never);
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ language: "en" } as never);
    vi.mocked(buildAidFeed).mockResolvedValue({
      priority: [
        {
          id: "finpulse:1",
          source: "finpulse",
          impactScore: 5,
          headline: "Rates steady",
          sortDate: "2026-05-28T10:00:00Z",
          anchorId: "aid-finpulse",
          label: "federalreserve",
        },
      ],
      topImpactScore: 5,
    });

    const res = await GET(new NextRequest("http://localhost/api/aid/feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.priority).toHaveLength(1);
    expect(body.topImpactScore).toBe(5);
  });
});
