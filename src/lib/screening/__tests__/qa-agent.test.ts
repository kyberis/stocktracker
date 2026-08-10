import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFetch,
  mockResolveKey,
  mockInsertQaRoundIssues,
  mockInsertScreeningAgentOutput,
  mockGetLatestOutput,
  mockGetRun,
  mockCountRounds,
  mockInsertAiLog,
  mockInsertSteps,
} = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockResolveKey: vi.fn(),
  mockInsertQaRoundIssues: vi.fn(),
  mockInsertScreeningAgentOutput: vi.fn(),
  mockGetLatestOutput: vi.fn(),
  mockGetRun: vi.fn(),
  mockCountRounds: vi.fn(),
  mockInsertAiLog: vi.fn(),
  mockInsertSteps: vi.fn(),
}));

vi.mock("@/lib/ai/gateway", () => ({
  fetchGatewayChatCompletions: mockFetch,
  resolveGatewayApiKey: mockResolveKey,
}));

vi.mock("@/lib/screening/resolve-model", () => ({
  resolveScreeningGatewayModel: vi.fn().mockResolvedValue("openai/gpt-4o-mini"),
  resolveScreeningModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
}));

vi.mock("@/lib/db", () => ({
  insertAiLog: mockInsertAiLog,
  insertScreeningAgentOutput: mockInsertScreeningAgentOutput,
  insertQaRoundIssues: mockInsertQaRoundIssues,
  countQaRoundsForRun: mockCountRounds,
  getLatestScreeningAgentOutputUnscoped: mockGetLatestOutput,
  getScreeningRunUnscoped: mockGetRun,
  insertSteps: mockInsertSteps,
}));

vi.mock("@/lib/screening/metrics", () => ({
  recordQaRound: vi.fn(),
}));

function makeAgentOutputRow(agentKind: string, outputJson: string) {
  return {
    id: `${agentKind}-1`,
    runId: "run-1",
    userId: "user-1",
    agentKind,
    ticker: null,
    agentIndex: null,
    outputJson,
    latencyMs: 0,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

const HARD_DATA_JSON = JSON.stringify({
  status: "ok",
  universeSize: 20,
  candidates: [
    {
      ticker: "AAPL",
      name: "Apple",
      sector: "Technology",
      country: "US",
      rankScore: 90,
      rankReason: "consumer tech",
      fwdPe: 20,
      ownHistPe: 22,
      evEbitda: 15,
      ndEbitda: 0.5,
      earningsResilient: false,
    },
  ],
  deferredTickers: [],
  gaps: [],
  locale: "en",
  sources: [],
});

const COMPILER_JSON = JSON.stringify({
  summary: "Screen produced Apple as a top candidate matching the brief.",
  candidateBullets: [
    {
      ticker: "AAPL",
      headline: "Durable growth",
      bullet: "Consumer tech with steady margins.",
    },
  ],
  disclaimer: "Research aid only.",
  locale: "en",
});

const RUN_ROW = {
  id: "run-1",
  userId: "user-1",
  status: "running",
  intent: "explore",
  briefJson: JSON.stringify({
    intent: "explore",
    includeSectors: [],
    excludeSectors: [],
    regions: [],
    candidateCount: 3,
    criteria: [],
    endedEarly: false,
    locale: "en",
    riskProfile: null,
  }),
  mockedPipeline: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const QA_STEP = {
  id: "step-qa",
  runId: "run-1",
  agentKind: "qa",
  ticker: null,
  status: "running" as const,
  attempts: 1,
  leaseOwner: null,
  leaseExpiresAt: null,
  dependsOn: [] as string[],
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function mockLayerBFail() {
  mockResolveKey.mockResolvedValue("test-key");
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  arguments: JSON.stringify({
                    verdict: "fail",
                    issues: [
                      {
                        issueType: "cross_agent_inconsistency",
                        ruleId: "R7",
                        agentKind: "ir_business",
                        ticker: "AAPL",
                        claimPath: "catalysts",
                        summary: "Price-drop cause is not in upstream evidence.",
                        blocking: true,
                      },
                    ],
                  }),
                },
              },
            ],
          },
        },
      ],
    }),
  });
}

describe("runQaStep", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
    mockInsertQaRoundIssues.mockReset().mockResolvedValue([]);
    mockInsertScreeningAgentOutput.mockReset().mockResolvedValue({});
    mockInsertAiLog.mockReset().mockResolvedValue("log-1");
    mockInsertSteps.mockReset().mockResolvedValue([]);
    mockCountRounds.mockReset().mockResolvedValue(0);
    mockGetRun.mockReset().mockResolvedValue(RUN_ROW);
    mockGetLatestOutput.mockReset().mockImplementation(
      (_runId: string, kind: string) => {
        if (kind === "hard_data") {
          return Promise.resolve(
            makeAgentOutputRow("hard_data", HARD_DATA_JSON),
          );
        }
        if (kind === "compiler") {
          return Promise.resolve(
            makeAgentOutputRow("compiler", COMPILER_JSON),
          );
        }
        return Promise.resolve(null);
      },
    );
  });

  it("merges Layer B failure into the round row and flips verdict to fail", async () => {
    mockLayerBFail();

    const { runQaStep } = await import("../agents/qa");
    const result = await runQaStep({
      step: QA_STEP,
      userId: "user-1",
      runId: "run-1",
      briefJson: RUN_ROW.briefJson,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.payload?.verdict).toBe("fail");
    expect(result.payload?.layerBIssues).toBe(1);
    expect(mockInsertQaRoundIssues).toHaveBeenCalledOnce();
    const insertArgs = mockInsertQaRoundIssues.mock.calls[0][0];
    expect(insertArgs.verdict).toBe("fail");
    expect(
      insertArgs.issues.some((i: { ruleId: string }) => i.ruleId === "R7"),
    ).toBe(true);
    expect(insertArgs.flaggedAgentKinds).toContain("ir_business");
  });

  it("schedules directed reruns on round-1 fail (force-fail → retry DAG)", async () => {
    mockLayerBFail();
    mockCountRounds.mockResolvedValue(0); // first QA round

    const { runQaStep } = await import("../agents/qa");
    const result = await runQaStep({
      step: QA_STEP,
      userId: "user-1",
      runId: "run-1",
      briefJson: RUN_ROW.briefJson,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.payload?.verdict).toBe("fail");
    expect(result.payload?.rerunsScheduled).toBe(true);
    expect(mockInsertSteps).toHaveBeenCalledOnce();
    const steps = mockInsertSteps.mock.calls[0][1] as Array<{
      agentKind: string;
      ticker?: string;
    }>;
    const kinds = steps.map((s) => s.agentKind);
    expect(kinds).toContain("ir_business");
    expect(kinds).toContain("aggregate_ir_business");
    expect(kinds).toContain("compiler");
    expect(kinds).toContain("qa");
    expect(steps.some((s) => s.ticker === "AAPL")).toBe(true);
  });

  it("degrades tickers when round cap is reached (no more reruns)", async () => {
    mockLayerBFail();
    // One prior round already persisted → this is round 2 (the last).
    mockCountRounds.mockResolvedValue(1);

    const { runQaStep } = await import("../agents/qa");
    const result = await runQaStep({
      step: QA_STEP,
      userId: "user-1",
      runId: "run-1",
      briefJson: RUN_ROW.briefJson,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.payload?.verdict).toBe("pass_with_degradation");
    expect(result.payload?.degradedTickers).toEqual(["AAPL"]);
    expect(result.payload?.rerunsScheduled).toBe(false);
    expect(mockInsertSteps).not.toHaveBeenCalled();
    const insertArgs = mockInsertQaRoundIssues.mock.calls[0][0];
    expect(insertArgs.verdict).toBe("pass_with_degradation");
    expect(insertArgs.degradedTickers).toEqual(["AAPL"]);
  });

  it("falls back to Layer A verdict when the gateway is not configured", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runQaStep } = await import("../agents/qa");
    const result = await runQaStep({
      step: QA_STEP,
      userId: "user-1",
      runId: "run-1",
      briefJson: RUN_ROW.briefJson,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.payload?.verdict).toBe("pass");
    expect(result.payload?.layerBIssues).toBe(0);
    expect(result.payload?.layerBError).toBe("gateway_not_configured");
    expect(mockInsertSteps).not.toHaveBeenCalled();
  });
});
