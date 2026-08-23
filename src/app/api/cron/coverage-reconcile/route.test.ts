import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/cron-coverage-reconcile", () => ({
  runCoverageReconcileJob: vi.fn().mockResolvedValue({
    checked: 0,
    missing: 0,
    missingTickers: [],
    figiResolved: 0,
  }),
}));

describe("GET /api/cron/coverage-reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/cron/coverage-reconcile"));

    expect(res.status).toBe(401);
    expect(verifyCronAuth).toHaveBeenCalledWith("coverage-reconcile", expect.any(NextRequest));
  });

  it("runs the weekly backup when auth passes", async () => {
    const { runCoverageReconcileJob } = await import("@/lib/cron-coverage-reconcile");
    const { GET } = await import("./route");

    const res = await GET(new NextRequest("http://localhost/api/cron/coverage-reconcile"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      checked: 0,
      missing: 0,
      missingTickers: [],
      figiResolved: 0,
    });
    expect(runCoverageReconcileJob).toHaveBeenCalledOnce();
  });
});
