import { describe, expect, it } from "vitest";
import { buildOptimisticRun, buildRunResponse } from "./build-run";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningStepRow } from "@/lib/db";

describe("buildOptimisticRun", () => {
  it("shows intake done and core agents pending before the first poll", () => {
    const run = buildOptimisticRun("run-xyz");
    expect(run.runId).toBe("run-xyz");
    expect(run.reportReady).toBe(false);
    const byKind = Object.fromEntries(run.steps.map((s) => [s.agentKind, s.status]));
    expect(byKind.intake).toBe("done");
    expect(byKind.hard_data).toBe("pending");
    expect(byKind.ir_business).toBe("pending");
    expect(byKind.web_sentiment).toBe("pending");
    expect(byKind.portfolio_context).toBe("pending");
    expect(byKind.risk).toBe("pending");
    expect(byKind.compiler).toBe("pending");
    expect(byKind.qa).toBe("skipped");
  });
});

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

  it("shows web/portfolio/risk as pending while hard data is active", () => {
    const steps = [
      step({ id: "hd", agentKind: "hard_data", status: "running" }),
      step({ id: "cmp", agentKind: "compiler", status: "pending" }),
    ];
    const run = buildRunResponse(runRow(), steps);
    const byKind = Object.fromEntries(run.steps.map((s) => [s.agentKind, s.status]));
    expect(byKind.web_sentiment).toBe("pending");
    expect(byKind.portfolio_context).toBe("pending");
    expect(byKind.risk).toBe("pending");
  });

  it("synthesises web_sentiment fan-out and hides aggregate barrier", () => {
    const steps = [
      step({ id: "hd", agentKind: "hard_data", status: "done" }),
      step({ id: "w1", agentKind: "web_sentiment", ticker: "AAPL", status: "done" }),
      step({ id: "w2", agentKind: "web_sentiment", ticker: "MSFT", status: "running" }),
      step({ id: "aw", agentKind: "aggregate_web_sentiment", status: "pending" }),
      step({ id: "pc", agentKind: "portfolio_context", status: "pending" }),
      step({ id: "rk", agentKind: "risk", status: "pending" }),
      step({ id: "cmp", agentKind: "compiler", status: "pending" }),
    ];
    const run = buildRunResponse(runRow(), steps);
    const web = run.steps.find((s) => s.agentKind === "web_sentiment");
    expect(web!.status).toBe("running");
    expect(web!.subStepsTotal).toBe(2);
    expect(run.steps.some((s) => s.agentKind === "aggregate_web_sentiment")).toBe(
      false,
    );
  });
});

describe("buildRunResponse QA gating", () => {
  const doneSteps = [
    step({ id: "hd", agentKind: "hard_data", status: "done" }),
    step({ id: "cmp", agentKind: "compiler", status: "done" }),
  ];

  it("keeps compiler-only readiness when qaGating is off", () => {
    const run = buildRunResponse(runRow(), doneSteps);
    expect(run.reportReady).toBe(true);
    expect(run.qa).toBeFalsy();
  });

  it("blocks reportReady when qaGating is on and verdict is null", () => {
    const run = buildRunResponse(runRow(), doneSteps, {
      qaGating: true,
      qaVerdict: null,
      qaRoundsCompleted: 0,
    });
    expect(run.reportReady).toBe(false);
    expect(run.qa).toEqual({
      gating: true,
      verdict: null,
      roundsCompleted: 0,
      maxRounds: 2,
    });
  });

  it("allows reportReady when verdict is pass", () => {
    const run = buildRunResponse(runRow(), doneSteps, {
      qaGating: true,
      qaVerdict: "pass",
      qaRoundsCompleted: 1,
    });
    expect(run.reportReady).toBe(true);
    expect(run.qa?.verdict).toBe("pass");
  });

  it("allows reportReady when verdict is pass_with_degradation", () => {
    const run = buildRunResponse(runRow(), doneSteps, {
      qaGating: true,
      qaVerdict: "pass_with_degradation",
      qaRoundsCompleted: 2,
    });
    expect(run.reportReady).toBe(true);
  });

  it("blocks reportReady when verdict is fail", () => {
    const run = buildRunResponse(runRow(), doneSteps, {
      qaGating: true,
      qaVerdict: "fail",
      qaRoundsCompleted: 1,
    });
    expect(run.reportReady).toBe(false);
  });
});
