import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/lib/trial-activation", () => ({
  activateProTrial: vi.fn(),
  getTrialEligibilityError: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireSession } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { activateProTrial, getTrialEligibilityError } from "@/lib/trial-activation";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedFindUser = vi.mocked(findUserById);
const mockedActivate = vi.mocked(activateProTrial);
const mockedEligibility = vi.mocked(getTrialEligibilityError);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/trial/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedEligibility.mockReturnValue(null);
});

describe("POST /api/trial/activate", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "abc" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing token", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedFindUser.mockResolvedValue({
      id: "u1",
      plan: "free",
      trial_token: "real-token",
      trial_activated_at: "",
    } as never);
    mockedEligibility.mockReturnValue("invalid_token");

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "wrong-token" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid or expired");
  });

  it("returns 400 when trial already activated", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedFindUser.mockResolvedValue({
      id: "u1",
      plan: "free",
      trial_token: "my-token",
      trial_activated_at: "2026-01-01T00:00:00Z",
    } as never);
    mockedEligibility.mockReturnValue("already_activated");

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "my-token" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already activated");
  });

  it("returns 400 when user is already on paid plan", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedFindUser.mockResolvedValue({
      id: "u1",
      plan: "pro",
      trial_token: "my-token",
      trial_activated_at: "",
    } as never);
    mockedEligibility.mockReturnValue("not_free_plan");

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "my-token" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("paid plan");
  });

  it("activates trial successfully", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedFindUser.mockResolvedValue({
      id: "u1",
      plan: "free",
      trial_token: "valid-token",
      trial_activated_at: "",
    } as never);
    mockedActivate.mockResolvedValue({ planExpiresAt: "2026-01-08T00:00:00.000Z" });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.planExpiresAt).toBe("2026-01-08T00:00:00.000Z");
    expect(mockedActivate).toHaveBeenCalledWith("u1");
  });
});
