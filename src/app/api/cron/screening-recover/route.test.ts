import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging:
    (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
      const result = await fn();
      return NextResponse.json(result);
    },
}));

vi.mock("@/lib/db", () => ({
  recoverExpiredLeases: vi.fn().mockResolvedValue({ requeued: 0, failed: 0 }),
  countPendingSteps: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/screening/orchestrator/kick-worker", () => ({
  kickScreeningWorker: vi.fn(),
}));

describe("GET /api/cron/screening-recover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const response = await GET(new NextRequest("http://localhost/api/cron/screening-recover"));
    expect(response.status).toBe(401);
  });

  it("does not kick the worker when nothing is pending and nothing was requeued", async () => {
    const { kickScreeningWorker } = await import(
      "@/lib/screening/orchestrator/kick-worker"
    );
    const { GET } = await import("./route");

    const res = await GET(
      new NextRequest("http://localhost/api/cron/screening-recover", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      requeued: 0,
      failed: 0,
      pending: 0,
      workerKicked: false,
    });
    expect(kickScreeningWorker).not.toHaveBeenCalled();
  });

  it("kicks the worker when leases were requeued", async () => {
    const { recoverExpiredLeases } = await import("@/lib/db");
    vi.mocked(recoverExpiredLeases).mockResolvedValueOnce({ requeued: 2, failed: 0 });
    const { kickScreeningWorker } = await import(
      "@/lib/screening/orchestrator/kick-worker"
    );
    const { GET } = await import("./route");

    const res = await GET(
      new NextRequest("http://localhost/api/cron/screening-recover", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workerKicked).toBe(true);
    expect(kickScreeningWorker).toHaveBeenCalledTimes(1);
  });

  it("kicks the worker when orphaned pending steps exist (no expired leases)", async () => {
    const { countPendingSteps } = await import("@/lib/db");
    vi.mocked(countPendingSteps).mockResolvedValueOnce(3);
    const { kickScreeningWorker } = await import(
      "@/lib/screening/orchestrator/kick-worker"
    );
    const { GET } = await import("./route");

    const res = await GET(
      new NextRequest("http://localhost/api/cron/screening-recover", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ pending: 3, workerKicked: true });
    expect(kickScreeningWorker).toHaveBeenCalledTimes(1);
  });
});
