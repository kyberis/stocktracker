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

vi.mock("@/lib/db", () => ({
  insertAiLog: vi.fn().mockResolvedValue("log-1"),
  insertScreeningAgentOutput: vi.fn().mockResolvedValue({}),
  getLatestScreeningAgentOutputUnscoped: vi.fn().mockResolvedValue(null),
}));

const brief = {
  intent: "explore" as const,
  includeSectors: ["Technology"],
  excludeSectors: [],
  regions: ["us_canada"],
  candidateCount: 3,
  criteria: [],
  endedEarly: false,
  locale: "en",
  riskProfile: "conservative" as const,
};

const hardData = {
  status: "ok" as const,
  universeSize: 40,
  candidates: [
    {
      ticker: "AAPL",
      name: "Apple",
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      marketCapUsd: 3_000_000_000_000,
      price: 200,
      rankScore: 90,
      rankReason: "Durable",
    },
  ],
  deferredTickers: [],
  gaps: [],
  locale: "en",
  sources: [],
};

const portfolioContext = {
  sectorGaps: [],
  perCandidate: [
    {
      ticker: "AAPL",
      positionKind: "top_up_existing" as const,
      topUpTicker: "AAPL",
      overlapNotes: "Held",
      illustrativeAllocationEur: { min: 500, max: 1500 },
      rationale: "Top up",
    },
  ],
  cashAvailableEur: 5_000,
  gaps: [],
};

describe("runRiskAgent", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
  });

  it("falls back with assumedProfile false when riskProfile is set", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runRiskAgent } = await import("../agents/risk");
    const res = await runRiskAgent({
      brief,
      hardData,
      portfolioContext,
    });
    expect(res.output.assumedProfile).toBe(false);
    expect(res.output.perCandidate[0]?.suitability).toBe("stretch");
    expect(res.errorMessage).toBe("gateway_not_configured");
  });

  it("marks assumedProfile when brief.riskProfile is null", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runRiskAgent } = await import("../agents/risk");
    const res = await runRiskAgent({
      brief: { ...brief, riskProfile: null },
      hardData,
      portfolioContext,
    });
    expect(res.output.assumedProfile).toBe(true);
    expect(res.output.portfolioLevelFlags).toContain("assumed_balanced_profile");
  });

  it("coerces a valid tool call", async () => {
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
                        assumedProfile: false,
                        perCandidate: [
                          {
                            ticker: "AAPL",
                            illustrativeWeightPct: 4,
                            concentrationImpact: "Modest top-up",
                            riskFlags: [],
                            suitability: "fit",
                            rationale: "Fits conservative band",
                          },
                        ],
                        portfolioLevelFlags: [],
                        gaps: [],
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
    const { runRiskAgent } = await import("../agents/risk");
    const res = await runRiskAgent({
      brief,
      hardData,
      portfolioContext,
    });
    expect(res.output.perCandidate[0]?.suitability).toBe("fit");
    expect(res.output.perCandidate[0]?.illustrativeWeightPct).toBe(4);
    expect(res.errorMessage).toBeNull();
  });
});
