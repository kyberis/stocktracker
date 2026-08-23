import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/prodops", () => ({
  dispatchPendingProdOpsEvents: vi.fn().mockResolvedValue({
    pending: 2,
    sent: 1,
    dropped: 0,
    failed: 1,
    skipped: 0,
  }),
}));

describe("GET/POST /api/cron/prodops-dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/cron/prodops-dispatch"));

    expect(response.status).toBe(401);
  });

  it("runs the prodops dispatcher when cron auth passes", async () => {
    const { dispatchPendingProdOpsEvents } = await import("@/lib/prodops");
    const { POST } = await import("./route");

    const response = await POST(
      new NextRequest("http://localhost/api/cron/prodops-dispatch", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      pending: 2,
      sent: 1,
      dropped: 0,
      failed: 1,
      skipped: 0,
    });
    expect(dispatchPendingProdOpsEvents).toHaveBeenCalledTimes(1);
  });

  it("accepts GET so Vercel Cron can invoke the hourly backup", async () => {
    const { dispatchPendingProdOpsEvents } = await import("@/lib/prodops");
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/cron/prodops-dispatch", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(dispatchPendingProdOpsEvents).toHaveBeenCalledTimes(1);
  });
});
