import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    createSessionToken: vi.fn().mockResolvedValue("session-token"),
    getSessionCookieConfig: vi.fn().mockReturnValue({ name: "trefolio_session", value: "session-token" }),
  };
});

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/metrics", () => ({
  authEventsTotal: { inc: vi.fn() },
}));

import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserPassword } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { NextRequest } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedFindUserById = vi.mocked(findUserById);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedUpdateUserPassword = vi.mocked(updateUserPassword);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireSession.mockResolvedValue({
    session: { userId: "user-1", username: "u1", role: "user", mustChangePassword: false, plan: "free" },
    error: null,
  } as never);
});

describe("POST /api/auth/change-password", () => {
  it("returns 409 no_password_set for an OAuth/passkey user with no usable password", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      username: "u1",
      email: "oauth-user@example.com",
      password_hash: "",
      role: "user",
      plan: "free",
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ currentPassword: "whatever", newPassword: "newpass123" }),
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("no_password_set");
    expect(mockedVerifyPassword).not.toHaveBeenCalled();
    expect(mockedUpdateUserPassword).not.toHaveBeenCalled();
  });

  it("still verifies password normally for a user with a usable password", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-2",
      username: "u2",
      email: "local-user@example.com",
      password_hash: "$2b$10$fakehash",
      role: "user",
      plan: "free",
      email_verified: 1,
      onboarding_completed: 1,
    } as never);
    mockedVerifyPassword.mockResolvedValue(true);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ currentPassword: "correct-password", newPassword: "newpass123" }),
    );

    expect(res.status).toBe(200);
    expect(mockedVerifyPassword).toHaveBeenCalledWith("correct-password", "$2b$10$fakehash");
    expect(mockedUpdateUserPassword).toHaveBeenCalled();
  });

  it("rejects an incorrect current password for a user with a usable password", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-3",
      username: "u3",
      email: "local-user-2@example.com",
      password_hash: "$2b$10$fakehash",
      role: "user",
      plan: "free",
    } as never);
    mockedVerifyPassword.mockResolvedValue(false);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ currentPassword: "wrong-password", newPassword: "newpass123" }),
    );

    expect(res.status).toBe(401);
    expect(mockedUpdateUserPassword).not.toHaveBeenCalled();
  });
});
