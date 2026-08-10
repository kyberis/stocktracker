import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  deleteUser: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual };
});

vi.mock("@/lib/theme-preferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/theme-preferences")>();
  return { ...actual };
});

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/metrics", () => ({
  authEventsTotal: { inc: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  verifyAccountDeletionToken: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { findUserById, deleteUser } from "@/lib/db";
import { verifyAccountDeletionToken } from "@/lib/email";
import { NextRequest } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedFindUserById = vi.mocked(findUserById);
const mockedDeleteUser = vi.mocked(deleteUser);
const mockedVerifyAccountDeletionToken = vi.mocked(verifyAccountDeletionToken);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/delete-account/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireSession.mockResolvedValue({
    session: { userId: "user-oauth-1", username: "u1", role: "user", mustChangePassword: false, plan: "free" },
    error: null,
  } as never);
});

describe("POST /api/auth/delete-account/confirm", () => {
  it("deletes the account for a valid token matching the live session and email", async () => {
    mockedVerifyAccountDeletionToken.mockResolvedValue({
      userId: "user-oauth-1",
      email: "oauth-user@example.com",
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-oauth-1",
      email: "oauth-user@example.com",
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "valid-token" }),
    );

    expect(res.status).toBe(200);
    expect(mockedDeleteUser).toHaveBeenCalledWith("user-oauth-1");
  });

  it("rejects an invalid or expired token", async () => {
    mockedVerifyAccountDeletionToken.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "bad-token" }),
    );

    expect(res.status).toBe(400);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("rejects when the token's userId does not match the live session (401/no session already handled by requireSession; this covers cross-account replay)", async () => {
    mockedVerifyAccountDeletionToken.mockResolvedValue({
      userId: "some-other-user",
      email: "someone-else@example.com",
    });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "mismatched-user-token" }),
    );

    expect(res.status).toBe(403);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("rejects when the account's email changed since the token was issued", async () => {
    mockedVerifyAccountDeletionToken.mockResolvedValue({
      userId: "user-oauth-1",
      email: "old-email@example.com",
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-oauth-1",
      email: "new-email@example.com",
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "stale-email-token" }),
    );

    expect(res.status).toBe(400);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("blocks admin accounts from self-deleting through this endpoint", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "admin-1", username: "a1", role: "admin", mustChangePassword: false, plan: "free" },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "x" }),
    );

    expect(res.status).toBe(403);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
    expect(mockedVerifyAccountDeletionToken).not.toHaveBeenCalled();
  });

  it("returns the session error as-is when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ token: "x" }),
    );

    expect(res.status).toBe(401);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });
});
