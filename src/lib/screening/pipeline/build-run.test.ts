import { describe, expect, it } from "vitest";
import { buildRunResponse } from "./build-run";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningStepRow } from "@/lib/db";

function runRow(overrides: Partial<ScreeningRunRow> = {}): ScreeningRunRow {
  return {
    id: "run-1",
    userId: "user-1",
    status: "authorized",
    intent: "explore",
    briefJson: "{}",
    mockedPipeline: false,
    createdAt: "2026-08-07T12:00:00.000Z",
    updatedAt: "2026-08-07T12:00:00.000Z",
    ...overrides,
  };
}

function step(
  overrides: Partial<ScreeningStepRow> & {
    id: string;
    agentKind: string;
  },
): ScreeningStepRow {
  return {
    runId: "run-1",
    ticker: null,
    status: "pending",
    attempts: 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    dependsOn: [],
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2026-08-07T12:00:00.000Z",
    updatedAt: "2026-08-07T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildRunResponse IR fan-out", () => {
  it("synthesises multiple ir_business steps into one UI row with sub-counts", () => {
    const steps = [
      step({ id: "hd", agentKind: "hard_data", status: "done", startedAt: "2026-08-07T12:00:00.000Z", completedAt: "2026-08-07T12:00:10.000Z" }),
      step({ id: "ir1", agentKind: "ir_business", ticker: "AAPL", status: "done", startedAt: "2026-08-07T12:00:10.000Z", completedAt: "2026-08-07T12:00:20.000Z" }),
      step({ id: "ir2", agentKind: "ir_business", ticker: "MSFT", status: "running", startedAt: "2026-08-07T12:00:10.000Z" }),
      step({ id: "ir3", agentKind: "ir_business", ticker: "GOOG", status: "pending" }),
      step({ id: "agg", agentKind: "aggregate_ir_business", status: "pending", dependsOn: ["ir1", "ir2", "ir3"] }),
      step({ id: "cmp", agentKind: "compiler", status: "pending", dependsOn: ["agg"] }),
    ];

    const run = buildRunResponse(runRow(), steps);
    const ir = run.steps.find((s) => s.agentKind === "ir_business");
    expect(ir).toBeDefined();
    expect(ir!.status).toBe("running");
    expect(ir!.subStepsTotal).toBe(3);
    expect(ir!.subStepsDone).toBe(1);
    // Internal barrier is not shown in the UI timeline.
    expect(run.steps.some((s) => s.agentKind === "aggregate_ir_business")).toBe(
      false,
    );
    expect(run.reportReady).toBe(false);
  });

  it("marks ir_business done when all ticker steps are done", () => {
    const steps = [
      step({ id: "hd", agentKind: "hard_data", status: "done" }),
      step({ id: "ir1", agentKind: "ir_business", ticker: "AAPL", status: "done" }),
      step({ id: "ir2", agentKind: "ir_business", ticker: "MSFT", status: "done" }),
      step({ id: "agg", agentKind: "aggregate_ir_business", status: "done" }),
      step({ id: "cmp", agentKind: "compiler", status: "done" }),
    ];
    const run = buildRunResponse(runRow({ status: "completed" }), steps);
    const ir = run.steps.find((s) => s.agentKind === "ir_business");
    expect(ir!.status).toBe("done");
    expect(ir!.subStepsDone).toBe(2);
    expect(run.reportReady).toBe(true);
    expect(run.status).toBe("completed");
  });
});
