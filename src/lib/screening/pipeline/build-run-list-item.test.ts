import { describe, expect, it } from "vitest";
import { toScreeningRunListItem } from "./build-run-list-item";
import type { ScreeningRunRow } from "@/lib/db/screening";
import type { ScreeningStepRow } from "@/lib/db";

function run(overrides: Partial<ScreeningRunRow> = {}): ScreeningRunRow {
  return {
    id: "mock-abc",
    userId: "u1",
    status: "authorized",
    intent: "explore",
    briefJson: JSON.stringify({
      includeSectors: ["Healthcare"],
      regions: ["europe"],
      candidateCount: 4,
    }),
    mockedPipeline: true,
    createdAt: "2026-08-07T10:00:00.000Z",
    updatedAt: "2026-08-07T10:00:00.000Z",
    ...overrides,
  };
}

describe("toScreeningRunListItem", () => {
  it("treats mock runs without steps as completed + reportReady", () => {
    const item = toScreeningRunListItem(run(), []);
    expect(item.status).toBe("completed");
    expect(item.reportReady).toBe(true);
    expect(item.summary).toContain("Healthcare");
    expect(item.candidateCount).toBe(4);
    expect(item.mocked).toBe(true);
  });

  it("marks real runs completed when compiler is done", () => {
    const steps: ScreeningStepRow[] = [
      {
        id: "c1",
        runId: "r1",
        agentKind: "compiler",
        ticker: null,
        status: "done",
        attempts: 1,
        leaseOwner: null,
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: "2026-08-07T10:00:00.000Z",
        updatedAt: "2026-08-07T10:00:00.000Z",
      },
    ];
    const item = toScreeningRunListItem(
      run({ id: "uuid-1", mockedPipeline: false, status: "running" }),
      steps,
    );
    expect(item.status).toBe("completed");
    expect(item.reportReady).toBe(true);
  });
});
