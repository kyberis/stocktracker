import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/ai/office/office-identity", () => ({
  resolveOfficeIdentity: vi.fn(),
}));

vi.mock("@/lib/ai/office/clara-client", () => ({
  ensureClaraUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { ensureClaraUser } from "@/lib/ai/office/clara-client";
import { findUserById } from "@/lib/db";
import { POST } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedIdentity = vi.mocked(resolveOfficeIdentity);
const mockedEnsure = vi.mocked(ensureClaraUser);
const mockedUser = vi.mocked(findUserById);

function req() {
  return new NextRequest("http://localhost/api/clara/activate", { method: "POST" });
}

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
      onboardingCompleted: false,
    },
    error: null,
  } as never);
  mockedUser.mockResolvedValue({
    id: "u1",
    username: "u",
    display_name: "Ada",
    email: "u@test.dev",
  } as never);
});

describe("POST /api/clara/activate", () => {
  it("returns 400 when IdP sub is missing", async () => {
    mockedIdentity.mockResolvedValue({
      idpSub: "",
      email: "u@test.dev",
      trefolioUserId: "u1",
    });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ linked: false, error: "missing_idp_sub" });
    expect(mockedEnsure).not.toHaveBeenCalled();
  });

  it("provisions Clara and returns linked", async () => {
    mockedIdentity.mockResolvedValue({
      idpSub: "sub-1",
      email: "u@test.dev",
      trefolioUserId: "u1",
    });
    mockedEnsure.mockResolvedValue({
      ok: true,
      created: true,
      id: "clara-1",
      idpSub: "sub-1",
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      linked: true,
      created: true,
      claraUserId: "clara-1",
    });
    expect(mockedEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ idpSub: "sub-1" }),
      { name: "Ada" },
    );
  });

  it("surfaces Clara errors", async () => {
    mockedIdentity.mockResolvedValue({
      idpSub: "sub-1",
      email: "u@test.dev",
      trefolioUserId: "u1",
    });
    mockedEnsure.mockResolvedValue({
      ok: false,
      error: "clara_unreachable",
      status: 503,
    });
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ linked: false, error: "clara_unreachable" });
  });
});
