import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  deleteUser: vi.fn(),
  trackEvent: vi.fn(),
  getUserSettings: vi.fn().mockResolvedValue({ language: "en" }),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
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
  createAccountDeletionToken: vi.fn().mockResolvedValue("fake-token"),
  sendAccountDeletionEmail: vi.fn().mockResolvedValue({ success: true }),
  canSendAccountDeletionEmail: vi.fn().mockResolvedValue(true),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

import { requireSession } from "@/lib/auth/guards";
import { findUserById, deleteUser } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createAccountDeletionToken,
  sendAccountDeletionEmail,
  canSendAccountDeletionEmail,
} from "@/lib/email";
import { NextRequest } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedFindUserById = vi.mocked(findUserById);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedDeleteUser = vi.mocked(deleteUser);
const mockedCreateAccountDeletionToken = vi.mocked(createAccountDeletionToken);
const mockedSendAccountDeletionEmail = vi.mocked(sendAccountDeletionEmail);
const mockedCanSendAccountDeletionEmail = vi.mocked(canSendAccountDeletionEmail);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCanSendAccountDeletionEmail.mockResolvedValue(true);
  mockedCreateAccountDeletionToken.mockResolvedValue("fake-token");
  mockedSendAccountDeletionEmail.mockResolvedValue({ success: true });
  mockedRequireSession.mockResolvedValue({
    session: { userId: "user-1", username: "u1", role: "user", mustChangePassword: false, plan: "free" },
    error: null,
  } as never);
});

describe("POST /api/auth/delete-account", () => {
  it("deletes immediately for a user with a usable password", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      email: "local@example.com",
      password_hash: "$2b$10$fakehash",
    } as never);
    mockedVerifyPassword.mockResolvedValue(true);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ password: "correct-password" }),
    );

    expect(res.status).toBe(200);
    expect(mockedDeleteUser).toHaveBeenCalledWith("user-1");
    expect(mockedCreateAccountDeletionToken).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password for a user with a usable password", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      email: "local@example.com",
      password_hash: "$2b$10$fakehash",
    } as never);
    mockedVerifyPassword.mockResolvedValue(false);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ password: "wrong-password" }),
    );

    expect(res.status).toBe(401);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("sends a confirmation email and does NOT delete for a passwordless (OAuth) user", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-oauth-1",
      email: "oauth-user@example.com",
      password_hash: "",
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(makeRequest({}));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requiresEmailConfirmation).toBe(true);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
    expect(mockedVerifyPassword).not.toHaveBeenCalled();
    expect(mockedCreateAccountDeletionToken).toHaveBeenCalledWith("user-oauth-1", "oauth-user@example.com");
    expect(mockedSendAccountDeletionEmail).toHaveBeenCalled();
  });

  it("returns 429 when the deletion-email cooldown is active for a passwordless user", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-oauth-2",
      email: "oauth-user-2@example.com",
      password_hash: "",
    } as never);
    mockedCanSendAccountDeletionEmail.mockResolvedValue(false);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(makeRequest({}));

    expect(res.status).toBe(429);
    expect(mockedSendAccountDeletionEmail).not.toHaveBeenCalled();
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("blocks admin accounts from self-deleting through this endpoint", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "admin-1", username: "a1", role: "admin", mustChangePassword: false, plan: "free" },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(makeRequest({ password: "x" }));

    expect(res.status).toBe(403);
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });
});
