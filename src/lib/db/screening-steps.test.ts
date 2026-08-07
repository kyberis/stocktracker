import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", async () => {
  let counter = 0;
  return {
    randomUUID: () => `id-${++counter}`,
  };
});

describe("screening-steps DAL", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockBatch.mockReset();
    mockBatch.mockResolvedValue([]);
  });

  it("insertSteps writes one row per definition", async () => {
    const { insertSteps } = await import("./screening-steps");
    const rows = await insertSteps("run-1", [
      { agentKind: "hard_data" },
      { agentKind: "compiler", dependsOn: ["step-hard"] },
    ]);
    expect(rows.map((r) => r.agentKind)).toEqual(["hard_data", "compiler"]);
    expect(rows[1].dependsOn).toEqual(["step-hard"]);
    expect(mockBatch).toHaveBeenCalledTimes(1);
    const [stmts] = mockBatch.mock.calls[0];
    expect(stmts).toHaveLength(2);
    expect(stmts[0].sql).toContain("INSERT INTO screening_run_steps");
  });

  it("leasePendingStep skips a candidate whose dependencies are not yet done", async () => {
    // 1st call: candidate rows
    mockExecute.mockResolvedValueOnce({
      rows: [
        { id: "s1", run_id: "r1", depends_on: JSON.stringify(["dep1"]) },
      ],
    });
    // 2nd call: dep status = pending → not runnable
    mockExecute.mockResolvedValueOnce({
      rows: [{ id: "dep1", status: "pending" }],
    });

    const { leasePendingStep } = await import("./screening-steps");
    const leased = await leasePendingStep({
      runId: "r1",
      ownerId: "owner-1",
      leaseMs: 30_000,
    });
    expect(leased).toBeNull();
  });

  it("leasePendingStep cascade-skips a step when a dependency has failed", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { id: "s1", run_id: "r1", depends_on: JSON.stringify(["dep1"]) },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "dep1", status: "failed" }],
      })
      // cascade UPDATE
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    const { leasePendingStep } = await import("./screening-steps");
    const leased = await leasePendingStep({
      runId: "r1",
      ownerId: "owner-1",
      leaseMs: 30_000,
    });
    expect(leased).toBeNull();
    const cascadeCall = mockExecute.mock.calls[2][0];
    expect(cascadeCall.sql).toMatch(/status = 'skipped'/);
  });

  it("leasePendingStep successfully leases when deps are done", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ id: "s2", run_id: "r1", depends_on: "[]" }],
      })
      // update RETURNING
      .mockResolvedValueOnce({
        rows: [
          {
            id: "s2",
            run_id: "r1",
            agent_kind: "hard_data",
            ticker: null,
            status: "running",
            attempts: 1,
            lease_owner: "owner-1",
            lease_expires_at: "2026-08-07T00:00:30.000Z",
            depends_on: "[]",
            error_message: null,
            started_at: "2026-08-07T00:00:00.000Z",
            completed_at: null,
            created_at: "2026-08-07T00:00:00.000Z",
            updated_at: "2026-08-07T00:00:00.000Z",
          },
        ],
      })
      // appendEvent INSERT
      .mockResolvedValueOnce({ rows: [] });

    const { leasePendingStep } = await import("./screening-steps");
    const leased = await leasePendingStep({
      runId: "r1",
      ownerId: "owner-1",
      leaseMs: 30_000,
    });
    expect(leased).not.toBeNull();
    expect(leased?.id).toBe("s2");
    expect(leased?.status).toBe("running");
    expect(leased?.attempts).toBe(1);
    // 3 calls: candidates, lease UPDATE, StepStarted event insert
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("completeStep only succeeds when the lease owner matches", async () => {
    // failing case: no row returned
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const { completeStep } = await import("./screening-steps");
    const res = await completeStep({ stepId: "s2", ownerId: "other" });
    expect(res).toBeNull();
    const call = mockExecute.mock.calls[0][0];
    expect(call.sql).toMatch(/WHERE id = \? AND status = 'running' AND lease_owner = \?/);
  });

  it("failStep requeues while attempts < MAX_STEP_ATTEMPTS", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ attempts: 1, run_id: "r1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "s2",
            run_id: "r1",
            agent_kind: "hard_data",
            ticker: null,
            status: "pending",
            attempts: 1,
            lease_owner: null,
            lease_expires_at: null,
            depends_on: "[]",
            error_message: "boom",
            started_at: null,
            completed_at: null,
            created_at: "2026-08-07T00:00:00.000Z",
            updated_at: "2026-08-07T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const { failStep } = await import("./screening-steps");
    const res = await failStep({
      stepId: "s2",
      ownerId: "owner-1",
      errorMessage: "boom",
    });
    expect(res?.status).toBe("pending");
    // second call = UPDATE with nextStatus arg
    const updateCall = mockExecute.mock.calls[1][0];
    expect(updateCall.args[0]).toBe("pending");
  });

  it("failStep marks permanently failed at MAX_STEP_ATTEMPTS", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ attempts: 3, run_id: "r1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "s2",
            run_id: "r1",
            agent_kind: "hard_data",
            ticker: null,
            status: "failed",
            attempts: 3,
            lease_owner: null,
            lease_expires_at: null,
            depends_on: "[]",
            error_message: "boom",
            started_at: null,
            completed_at: "2026-08-07T00:00:00.000Z",
            created_at: "2026-08-07T00:00:00.000Z",
            updated_at: "2026-08-07T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const { failStep } = await import("./screening-steps");
    const res = await failStep({
      stepId: "s2",
      ownerId: "owner-1",
      errorMessage: "boom",
    });
    expect(res?.status).toBe("failed");
    const updateCall = mockExecute.mock.calls[1][0];
    expect(updateCall.args[0]).toBe("failed");
  });

  it("recoverExpiredLeases requeues retriable steps and fails exhausted", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { id: "s3", run_id: "r1", attempts: 1 },
          { id: "s4", run_id: "r1", attempts: 3 },
        ],
      })
      // update s3 → pending
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      // event s3
      .mockResolvedValueOnce({ rows: [] })
      // update s4 → failed
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      // event s4
      .mockResolvedValueOnce({ rows: [] });

    const { recoverExpiredLeases } = await import("./screening-steps");
    const res = await recoverExpiredLeases(new Date("2026-08-07T00:00:00.000Z"));
    expect(res).toEqual({ requeued: 1, failed: 1 });
  });

  it("appendEvent writes with truncated payload", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const { appendEvent } = await import("./screening-steps");
    const ev = await appendEvent({
      runId: "r1",
      eventType: "TestEvent",
      payload: { foo: "bar" },
    });
    expect(ev.runId).toBe("r1");
    expect(ev.payloadJson).toBe('{"foo":"bar"}');
    const call = mockExecute.mock.calls[0][0];
    expect(call.sql).toContain("INSERT INTO screening_run_events");
  });
});
