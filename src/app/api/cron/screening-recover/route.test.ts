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

vi.mock("@/lib/screening/orchestrator/runner", () => ({
  processOneStep: vi.fn().mockResolvedValue({
    processed: 0,
    status: "no_work",
    moreWork: false,
  }),
}));

vi.mock("@/lib/screening/orchestrator/kick-worker", () => ({
  kickScreeningWorker: vi.fn().mockResolvedValue({ ok: true }),
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
      pendingBefore: 0,
      inlineProcessed: 0,
      workerKicked: false,
    });
    expect(kickScreeningWorker).not.toHaveBeenCalled();
  });

  it("processes steps inline when leases were requeued", async () => {
    const { recoverExpiredLeases, countPendingSteps } = await import("@/lib/db");
    vi.mocked(recoverExpiredLeases).mockResolvedValueOnce({ requeued: 2, failed: 0 });
    vi.mocked(countPendingSteps)
      .mockResolvedValueOnce(2) // pendingBefore
      .mockResolvedValueOnce(0) // pendingAfter after inline
      .mockResolvedValueOnce(0); // final pendingAfter
    const { processOneStep } = await import(
      "@/lib/screening/orchestrator/runner"
    );
    vi.mocked(processOneStep)
      .mockResolvedValueOnce({
        processed: 1,
        status: "processed",
        moreWork: true,
      })
      .mockResolvedValueOnce({
        processed: 1,
        status: "processed",
        moreWork: false,
      });
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
    expect(body.inlineProcessed).toBe(2);
    expect(body.workerKicked).toBe(false);
    expect(kickScreeningWorker).not.toHaveBeenCalled();
  });

  it("awaits a worker kick when orphaned pending steps remain after inline drain", async () => {
    const { countPendingSteps } = await import("@/lib/db");
    vi.mocked(countPendingSteps)
      .mockResolvedValueOnce(3) // pendingBefore
      .mockResolvedValueOnce(1) // pendingAfter inline
      .mockResolvedValueOnce(1); // final
    const { processOneStep } = await import(
      "@/lib/screening/orchestrator/runner"
    );
    vi.mocked(processOneStep).mockResolvedValue({
      processed: 0,
      status: "no_work",
      moreWork: false,
    });
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
    expect(kickScreeningWorker).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "await" }),
    );
  });
});
