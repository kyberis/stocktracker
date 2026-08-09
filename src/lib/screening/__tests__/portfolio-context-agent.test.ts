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
  listHoldings: vi.fn().mockResolvedValue([]),
  listCashEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/settings", () => ({
  getUserSettings: vi.fn().mockResolvedValue({ defaultCurrency: "EUR" }),
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
  riskProfile: "balanced" as const,
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
    {
      ticker: "SHOP",
      name: "Shopify",
      sector: "Technology",
      industry: "Software",
      country: "CA",
      marketCapUsd: 100_000_000_000,
      price: 80,
      rankScore: 82,
      rankReason: "Cloud commerce",
    },
  ],
  deferredTickers: [],
  gaps: [],
  locale: "en",
  sources: [],
};

const snapshot = {
  holdings: [
    {
      ticker: "AAPL",
      name: "Apple",
      sector: "Technology",
      valueEur: 10_000,
      shares: 50,
    },
  ],
  sectorAlloc: [{ label: "Technology", percent: 40 }],
  cashEur: 5_000,
  investedEur: 10_000,
  preferredCurrency: "EUR",
};

describe("runPortfolioContextAgent", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
  });

  it("falls back when the gateway has no key", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runPortfolioContextAgent } = await import(
      "../agents/portfolio-context"
    );
    const res = await runPortfolioContextAgent({
      brief,
      hardData,
      snapshot,
    });
    expect(res.output.perCandidate).toHaveLength(2);
    expect(res.output.perCandidate[0]?.positionKind).toBe("new_position");
    expect(res.output.cashAvailableEur).toBe(5_000);
    expect(res.errorMessage).toBe("gateway_not_configured");
  });

  it("coerces a valid tool call and drops unknown tickers", async () => {
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
                        sectorGaps: [
                          {
                            sector: "Healthcare",
                            currentPct: 5,
                            targetPct: 15,
                            gapPct: -10,
                          },
                        ],
                        perCandidate: [
                          {
                            ticker: "AAPL",
                            positionKind: "top_up_existing",
                            topUpTicker: "AAPL",
                            overlapNotes: "Already held",
                            illustrativeAllocationEur: { min: 500, max: 1500 },
                            rationale: "Top up quality compounder",
                          },
                          {
                            ticker: "GHOST",
                            positionKind: "new_position",
                            overlapNotes: "Should drop",
                            illustrativeAllocationEur: { min: 100, max: 200 },
                            rationale: "Unknown",
                          },
                          {
                            ticker: "SHOP",
                            positionKind: "new_position",
                            topUpTicker: null,
                            overlapNotes: "New name",
                            illustrativeAllocationEur: { min: 800, max: 2000 },
                            rationale: "Diversifying software",
                          },
                        ],
                        cashAvailableEur: 5000,
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
    const { runPortfolioContextAgent } = await import(
      "../agents/portfolio-context"
    );
    const res = await runPortfolioContextAgent({
      brief,
      hardData,
      snapshot,
    });
    expect(res.output.perCandidate.map((c) => c.ticker)).toEqual([
      "AAPL",
      "SHOP",
    ]);
    expect(res.output.perCandidate[0]?.positionKind).toBe("top_up_existing");
    expect(res.output.sectorGaps[0]?.sector).toBe("Healthcare");
    expect(res.errorMessage).toBeNull();
  });
});
