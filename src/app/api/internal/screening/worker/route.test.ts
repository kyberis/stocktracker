import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/screening/orchestrator/runner", () => ({
  processOneStep: vi.fn().mockResolvedValue({
    processed: 1,
    status: "processed",
    stepId: "step-1",
    agentKind: "hard_data",
    moreWork: false,
  }),
}));

vi.mock("@/lib/screening/orchestrator/kick-worker", () => ({
  kickScreeningWorker: vi.fn(),
}));

describe("POST /api/internal/screening/worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/screening/worker", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("processes one step and returns the result", async () => {
    const { processOneStep } = await import("@/lib/screening/orchestrator/runner");
    const { POST } = await import("./route");

    const response = await POST(
      new NextRequest("http://localhost/api/internal/screening/worker", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ runId: "run-42" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("processed");
    expect(processOneStep).toHaveBeenCalledWith({ runId: "run-42" });
  });

  it("self-invokes when moreWork remains after the inline drain cap", async () => {
    const { processOneStep } = await import("@/lib/screening/orchestrator/runner");
    vi.mocked(processOneStep).mockResolvedValue({
      processed: 1,
      status: "processed",
      stepId: "step-2",
      agentKind: "hard_data",
      moreWork: true,
    });
    const { kickScreeningWorker } = await import(
      "@/lib/screening/orchestrator/kick-worker"
    );
    const { POST } = await import("./route");

    await POST(
      new NextRequest("http://localhost/api/internal/screening/worker", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ runId: "run-42" }),
      }),
    );

    // Drains MAX_STEPS_PER_REQUEST (3) then deferred-kicks for the rest.
    expect(processOneStep).toHaveBeenCalledTimes(3);
    expect(kickScreeningWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-42",
        authorization: "Bearer test",
        mode: "defer",
      }),
    );
  });

  it("does not self-invoke when there is no more work", async () => {
    const { processOneStep } = await import("@/lib/screening/orchestrator/runner");
    vi.mocked(processOneStep).mockResolvedValue({
      processed: 1,
      status: "processed",
      stepId: "step-1",
      agentKind: "hard_data",
      moreWork: false,
    });
    const { kickScreeningWorker } = await import(
      "@/lib/screening/orchestrator/kick-worker"
    );
    const { POST } = await import("./route");

    await POST(
      new NextRequest("http://localhost/api/internal/screening/worker", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ runId: "run-42" }),
      }),
    );

    expect(kickScreeningWorker).not.toHaveBeenCalled();
  });
});
