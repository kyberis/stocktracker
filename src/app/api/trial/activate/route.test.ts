import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  updateUserSubscription: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserSubscription } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedFindUser = vi.mocked(findUserById);
const mockedUpdateSub = vi.mocked(updateUserSubscription);
const mockedEnsureInit = vi.mocked(ensureInitialized);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/trial/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockClient = {
  execute: vi.fn().mockResolvedValue({ rows: [] }),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
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

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(makeRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.planExpiresAt).toBeDefined();

    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", {
      plan: "pro",
      planExpiresAt: expect.any(String),
    });
    expect(mockClient.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining("trial_activated_at"),
      args: ["u1"],
    });
  });
});
