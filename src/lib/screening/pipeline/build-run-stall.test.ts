import { describe, expect, it } from "vitest";
import { buildRunResponse } from "./build-run";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningStepRow } from "@/lib/db";
import {
  SCREENING_STALE_MS,
  SCREENING_STUCK_MS,
} from "@/lib/screening/schemas";

function runRow(overrides: Partial<ScreeningRunRow> = {}): ScreeningRunRow {
  return {
    id: "run-1",
    userId: "u1",
    status: "authorized",
    intent: "explore",
    briefJson: "{}",
    mockedPipeline: false,
    costUsd: 0,
    costJson: "",
    costBreakdown: {
      currency: "USD",
      llmUsd: 0,
      tavilySearchUsd: 0,
      tavilyExtractUsd: 0,
      tavilyResearchUsd: 0,
      tavilySearchCredits: 0,
      tavilyExtractCredits: 0,
      tavilyResearchCredits: 0,
      llmTokensIn: 0,
      llmTokensOut: 0,
    },
    createdAt: "2026-08-08T12:00:00.000Z",
    updatedAt: "2026-08-08T12:00:00.000Z",
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
    id: overrides.id,
    runId: "run-1",
    agentKind: overrides.agentKind,
    ticker: overrides.ticker ?? null,
    status: overrides.status ?? "pending",
    attempts: overrides.attempts ?? 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    dependsOn: overrides.dependsOn ?? [],
    errorMessage: overrides.errorMessage ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-08-08T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-08T12:00:00.000Z",
  };
}

describe("buildRunResponse stallState", () => {
  it("marks fan-out with only pending rows as running and exposes subcounts", () => {
    const res = buildRunResponse(runRow(), [
      step({
        id: "hd",
        agentKind: "hard_data",
        status: "done",
        updatedAt: new Date().toISOString(),
      }),
      step({
        id: "t1",
        agentKind: "technicals",
        ticker: "AAA",
        status: "pending",
        updatedAt: new Date().toISOString(),
      }),
      step({
        id: "t2",
        agentKind: "technicals",
        ticker: "BBB",
        status: "pending",
        updatedAt: new Date().toISOString(),
      }),
    ]);
    const tech = res.steps.find((s) => s.agentKind === "technicals");
    expect(tech?.status).toBe("running");
    expect(tech?.subStepsTotal).toBe(2);
    expect(tech?.subStepsDone).toBe(0);
    expect(res.stallState).toBe("ok");
  });

  it("marks stuck when last activity is old", () => {
    const old = new Date(Date.now() - SCREENING_STUCK_MS - 5_000).toISOString();
    const res = buildRunResponse(runRow({ updatedAt: old }), [
      step({
        id: "hd",
        agentKind: "hard_data",
        status: "done",
        updatedAt: old,
      }),
      step({
        id: "t1",
        agentKind: "technicals",
        ticker: "AAA",
        status: "pending",
        updatedAt: old,
      }),
    ]);
    expect(res.stallState).toBe("stuck");
    expect(res.lastActivityAt).toBe(old);
  });

  it("marks stale between thresholds", () => {
    const mid = new Date(
      Date.now() - SCREENING_STALE_MS - 5_000,
    ).toISOString();
    const res = buildRunResponse(runRow({ updatedAt: mid }), [
      step({
        id: "hd",
        agentKind: "hard_data",
        status: "done",
        updatedAt: mid,
      }),
      step({
        id: "w1",
        agentKind: "web_sentiment",
        ticker: "AAA",
        status: "running",
        startedAt: mid,
        updatedAt: mid,
      }),
    ]);
    expect(res.stallState).toBe("stale");
  });
});
