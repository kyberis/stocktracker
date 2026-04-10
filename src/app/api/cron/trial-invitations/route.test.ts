import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendTrialInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/cron-logging", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withCronLogging: (_name: string, handler: () => Promise<Record<string, unknown>>) => {
      return async () => NextResponse.json(await handler());
    },
    verifyCronAuth: vi.fn().mockReturnValue(null),
  };
});

import { ensureInitialized } from "@/lib/db/client";
import { sendTrialInvitationEmail } from "@/lib/email";

const mockedEnsureInit = vi.mocked(ensureInitialized);
const mockedSendEmail = vi.mocked(sendTrialInvitationEmail);

const mockClient = {
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
});

describe("trial-invitations cron", () => {
  it("invites eligible users and returns count", async () => {
    mockClient.execute.mockResolvedValueOnce({
      rows: [
        { id: "u1", email: "a@test.com", display_name: "Alice", experience_level: "beginner" },
        { id: "u2", email: "b@test.com", display_name: "Bob", experience_level: "intermediate" },
      ],
    });
    mockClient.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ language: "es" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-invitations");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.invited).toBe(2);
    expect(body.errors).toBe(0);
    expect(mockedSendEmail).toHaveBeenCalledTimes(2);
  });

  it("handles empty result set gracefully", async () => {
    mockClient.execute.mockResolvedValueOnce({ rows: [] });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-invitations");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.invited).toBe(0);
    expect(body.errors).toBe(0);
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("counts errors when email send fails", async () => {
    mockClient.execute.mockResolvedValueOnce({
      rows: [{ id: "u1", email: "fail@test.com", display_name: "Fail", experience_level: "" }],
    });
    mockClient.execute.mockResolvedValueOnce({ rows: [] });
    mockClient.execute.mockResolvedValueOnce({ rows: [] });

    mockedSendEmail.mockRejectedValueOnce(new Error("Resend down"));

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-invitations");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.invited).toBe(0);
    expect(body.errors).toBe(1);
  });
});
