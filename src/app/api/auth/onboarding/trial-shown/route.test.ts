import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/trial-activation", () => ({
  markTrialOfferShown: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";
import { markTrialOfferShown } from "@/lib/trial-activation";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedTrackEvent = vi.mocked(trackEvent);
const mockedMarkShown = vi.mocked(markTrialOfferShown);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/onboarding/trial-shown", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/auth/onboarding/trial-shown", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when onboarding already completed", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1", onboardingCompleted: true },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/auth/onboarding/trial-shown", { method: "POST" }),
    );
    expect(res.status).toBe(400);
  });

  it("tracks trial shown and marks invited", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1", onboardingCompleted: false },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/auth/onboarding/trial-shown", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    expect(mockedMarkShown).toHaveBeenCalledWith("u1");
    expect(mockedTrackEvent).toHaveBeenCalledWith("u1", "onboarding_trial_shown", { source: "onboarding" });
  });
});
