import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/cron-lifecycle-emails", () => ({
  runLifecycleEmailsJob: vi.fn().mockResolvedValue({
    invitations: { invited: 1, errors: 0 },
    activation: { sent: 0, errors: 0 },
    winback: { sent: 2, errors: 0 },
  }),
}));

describe("GET/POST /api/cron/lifecycle-emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/cron/lifecycle-emails"));

    expect(res.status).toBe(401);
    expect(verifyCronAuth).toHaveBeenCalledWith("lifecycle-emails", expect.any(NextRequest));
  });

  it("runs all three lifecycle legs when auth passes", async () => {
    const { runLifecycleEmailsJob } = await import("@/lib/cron-lifecycle-emails");
    const { GET } = await import("./route");

    const res = await GET(new NextRequest("http://localhost/api/cron/lifecycle-emails"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      invitations: { invited: 1, errors: 0 },
      activation: { sent: 0, errors: 0 },
      winback: { sent: 2, errors: 0 },
    });
    expect(runLifecycleEmailsJob).toHaveBeenCalledOnce();
  });

  it("accepts POST the same as GET", async () => {
    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://localhost/api/cron/lifecycle-emails", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});
