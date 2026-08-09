import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch, mockResolveKey } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockResolveKey: vi.fn(),
}));

vi.mock("@/lib/ai/gateway", () => ({
  fetchGatewayChatCompletions: mockFetch,
  resolveGatewayApiKey: mockResolveKey,
}));

vi.mock("@/lib/screening/resolve-model", () => ({
  resolveScreeningGatewayModel: vi.fn().mockResolvedValue("openai/gpt-4o-mini"),
  resolveScreeningModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
}));

const {
  mockInsertSteps,
  mockFindStep,
  mockUpdateDependsOn,
  mockIsFeatureEnabled,
  mockFetchFmp,
} = vi.hoisted(() => ({
  mockInsertSteps: vi.fn(),
  mockFindStep: vi.fn(),
  mockUpdateDependsOn: vi.fn(),
  mockIsFeatureEnabled: vi.fn(),
  mockFetchFmp: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  insertAiLog: vi.fn().mockResolvedValue("log-1"),
  insertScreeningAgentOutput: vi.fn().mockResolvedValue({}),
  insertSteps: mockInsertSteps,
  findStepByAgentKind: mockFindStep,
  updateStepDependsOn: mockUpdateDependsOn,
  getLatestQaIssuesForAgentTicker: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/settings", () => ({
  isFeatureEnabledForUser: mockIsFeatureEnabled,
}));

vi.mock("@/lib/screening/data/fmp-screening", async () => {
  const actual = await vi.importActual<
    typeof import("../data/fmp-screening")
  >("../data/fmp-screening");
  return {
    ...actual,
    fetchFmpScreener: mockFetchFmp,
  };
});

vi.mock("@/lib/screening/data/trefolio-signals", () => ({
  loadTrefolioSignalsForTickers: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/screening/data/enrich-candidates", async () => {
  const actual = await vi.importActual<
    typeof import("../data/enrich-candidates")
  >("../data/enrich-candidates");
  return {
    ...actual,
    enrichHardDataCandidates: vi.fn(async (cands: unknown[]) => cands),
  };
});

const brief = {
  intent: "explore" as const,
  includeSectors: ["Technology"],
  excludeSectors: [],
  regions: ["us_canada"],
  candidateCount: 5,
  criteria: [
    { key: "marketCap", condition: "300 – 15,000M USD", source: "chat" as const },
  ],
  endedEarly: false,
  locale: "en",
  riskProfile: null,
};

const universe = [
  {
    ticker: "AAPL",
    name: "Apple",
    sector: "Technology",
    industry: "Consumer Electronics",
    country: "US",
    exchange: "NASDAQ",
    marketCapUsd: 3_000_000_000_000,
    price: 200,
  },
  {
    ticker: "SHOP",
    name: "Shopify",
    sector: "Technology",
    industry: "Software",
    country: "CA",
    exchange: "NYSE",
    marketCapUsd: 100_000_000_000,
    price: 80,
  },
  {
    ticker: "SNOW",
    name: "Snowflake",
    sector: "Technology",
    industry: "Software",
    country: "US",
    exchange: "NYSE",
    marketCapUsd: 60_000_000_000,
    price: 180,
  },
];

describe("runHardDataAgent", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
  });

  it("returns empty status when the universe is empty", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe: [] });
    expect(res.output.status).toBe("empty");
    expect(res.output.universeSize).toBe(0);
    expect(res.output.candidates).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls back to market-cap ranking when the gateway is not configured", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe });
    expect(res.output.status).toBe("ok");
    expect(res.output.candidates.map((c) => c.ticker)).toEqual([
      "AAPL",
      "SHOP",
      "SNOW",
    ]);
    expect(res.output.gaps).toContain("gateway_not_configured");
  });

  it("coerces the LLM tool call into the schema and clamps rank scores", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        status: "ok",
                        candidates: [
                          {
                            ticker: "shop",
                            rankScore: 130,
                            rankReason: "Great fit",
                          },
                          {
                            ticker: "AAPL",
                            rankScore: 80,
                            rankReason: "Solid quality name",
                          },
                          {
                            ticker: "GHOST",
                            rankScore: 40,
                            rankReason: "Not in universe",
                          },
                        ],
                        deferredTickers: ["snow"],
                        gaps: ["few sub-$5B tech names"],
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe });
    expect(res.output.status).toBe("ok");
    expect(res.output.candidates.map((c) => c.ticker)).toEqual([
      "SHOP",
      "AAPL",
      "GHOST",
    ]);
    // clamped to 100
    expect(res.output.candidates[0].rankScore).toBe(100);
    // metrics from universe are attached where possible
    const shop = res.output.candidates.find((c) => c.ticker === "SHOP");
    expect(shop?.marketCapUsd).toBe(100_000_000_000);
    expect(res.output.deferredTickers).toContain("snow");
    expect(res.output.gaps.length).toBeGreaterThan(0);
  });

  it("falls back to market-cap ranking when the LLM returns zero candidates", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        status: "empty",
                        candidates: [],
                        deferredTickers: [],
                        gaps: ["No candidates met the specified criteria"],
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe });
    expect(res.output.status).toBe("ok");
    expect(res.output.candidates.map((c) => c.ticker)).toEqual([
      "AAPL",
      "SHOP",
      "SNOW",
    ]);
    expect(res.output.gaps).toContain("llm_returned_empty");
    expect(res.output.sources?.some((s) => s.label.includes("FMP"))).toBe(true);
  });

  it("falls back when the LLM returns unparseable content", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: "totally not JSON",
              },
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe });
    expect(res.output.candidates.map((c) => c.ticker)).toEqual([
      "AAPL",
      "SHOP",
      "SNOW",
    ]);
    expect(res.errorMessage).toMatch(/json_parse|parse_failed/);
  });

  it("handles a gateway 400 by falling back to market-cap ranking", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("bad tool schema"),
      json: () => Promise.resolve({}),
    });
    const { runHardDataAgent } = await import("../agents/hard-data");
    const res = await runHardDataAgent({ brief, universe });
    expect(res.output.candidates).toHaveLength(3);
    expect(res.errorMessage).toContain("gateway_400");
  });
});

describe("runHardDataStep v2 fan-out", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
    mockInsertSteps.mockReset();
    mockFindStep.mockReset();
    mockUpdateDependsOn.mockReset();
    mockIsFeatureEnabled.mockReset();
    mockFetchFmp.mockReset();
    mockResolveKey.mockResolvedValue(null);
    mockFetchFmp.mockResolvedValue({
      candidates: universe,
      errors: [],
    });
    mockInsertSteps.mockResolvedValue([]);
    mockFindStep.mockResolvedValue({
      id: "compiler-step-1",
      status: "pending",
    });
    mockUpdateDependsOn.mockResolvedValue(undefined);
  });

  it("inserts IR + Web + PC + Risk and rewires compiler when v2 is on", async () => {
    mockIsFeatureEnabled.mockImplementation(async (flag: string) => {
      return (
        flag === "screening_agents_v2_enabled" ||
        flag === "screening_ir_agent_enabled"
      );
    });
    const { runHardDataStep } = await import("../agents/hard-data");
    const res = await runHardDataStep({
      runId: "run-v2",
      userId: "user-1",
      briefJson: JSON.stringify(brief),
      step: {
        id: "hd-1",
        runId: "run-v2",
        agentKind: "hard_data",
        ticker: null,
        status: "running",
        attempts: 1,
        leaseOwner: null,
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: "2026-08-07T12:00:00.000Z",
        completedAt: null,
        createdAt: "2026-08-07T12:00:00.000Z",
        updatedAt: "2026-08-07T12:00:00.000Z",
      },
    });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.payload?.webFanout).toBeGreaterThan(0);
    expect(res.payload?.irFanout).toBeGreaterThan(0);
    const inserted = mockInsertSteps.mock.calls[0]?.[1] as Array<{
      agentKind: string;
      ticker?: string;
      dependsOn?: string[];
    }>;
    const kinds = inserted.map((s) => s.agentKind);
    expect(kinds).toContain("ir_business");
    expect(kinds).toContain("web_sentiment");
    expect(kinds).toContain("aggregate_ir_business");
    expect(kinds).toContain("aggregate_web_sentiment");
    expect(kinds).toContain("portfolio_context");
    expect(kinds).toContain("risk");
    expect(mockUpdateDependsOn).toHaveBeenCalled();
    const compilerDeps = mockUpdateDependsOn.mock.calls[0]?.[1] as string[];
    expect(compilerDeps).toHaveLength(1);
  });

  it("keeps E4 shape (IR only) when v2 is off and IR is on", async () => {
    mockIsFeatureEnabled.mockImplementation(async (flag: string) => {
      return flag === "screening_ir_agent_enabled";
    });
    const { runHardDataStep } = await import("../agents/hard-data");
    const res = await runHardDataStep({
      runId: "run-e4",
      userId: "user-1",
      briefJson: JSON.stringify(brief),
      step: {
        id: "hd-1",
        runId: "run-e4",
        agentKind: "hard_data",
        ticker: null,
        status: "running",
        attempts: 1,
        leaseOwner: null,
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: "2026-08-07T12:00:00.000Z",
        completedAt: null,
        createdAt: "2026-08-07T12:00:00.000Z",
        updatedAt: "2026-08-07T12:00:00.000Z",
      },
    });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.payload?.webFanout).toBe(0);
    const inserted = mockInsertSteps.mock.calls[0]?.[1] as Array<{
      agentKind: string;
    }>;
    const kinds = inserted.map((s) => s.agentKind);
    expect(kinds).toContain("ir_business");
    expect(kinds).not.toContain("web_sentiment");
    expect(kinds).not.toContain("risk");
  });
});
