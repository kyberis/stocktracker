import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch, mockResolveKey } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockResolveKey: vi.fn(),
}));

vi.mock("@/lib/ai/gateway", () => ({
  fetchGatewayChatCompletions: mockFetch,
  resolveGatewayApiKey: mockResolveKey,
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
      rankReason: "Consumer tech leader with durable margins.",
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
      rankReason: "Cloud commerce compounder.",
    },
  ],
  deferredTickers: [],
  gaps: [],
  locale: "en",
};

describe("runCompilerAgent", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
  });

  it("returns a placeholder summary when hard data is empty", async () => {
    const { runCompilerAgent } = await import("../agents/compiler");
    const res = await runCompilerAgent({
      brief,
      hardData: { ...hardData, candidates: [], universeSize: 0 },
    });
    expect(res.draft.candidateBullets).toEqual([]);
    expect(res.draft.summary).toMatch(/no candidates/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls back deterministically when the gateway has no key", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runCompilerAgent } = await import("../agents/compiler");
    const res = await runCompilerAgent({ brief, hardData });
    expect(res.draft.candidateBullets.map((b) => b.ticker)).toEqual([
      "AAPL",
      "SHOP",
    ]);
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
                        summary: "Screened a technology universe and picked the top fits.",
                        candidateBullets: [
                          {
                            ticker: "AAPL",
                            headline: "Consumer tech durable",
                            bullet: "Strong ecosystem and free-cash generation.",
                          },
                          {
                            ticker: "GHOST",
                            headline: "Should be dropped",
                            bullet: "Not in hard data.",
                          },
                          {
                            ticker: "SHOP",
                            headline: "Cloud compounder",
                            bullet: "Merchant tooling with recurring revenue.",
                          },
                        ],
                        disclaimer: "Research aid only.",
                        locale: "en",
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
    const { runCompilerAgent } = await import("../agents/compiler");
    const res = await runCompilerAgent({ brief, hardData });
    expect(res.draft.candidateBullets.map((b) => b.ticker)).toEqual([
      "AAPL",
      "SHOP",
    ]);
    expect(res.draft.summary).toContain("technology universe");
    expect(res.errorMessage).toBeNull();
  });

  it("falls back on invalid JSON from the model", async () => {
    mockResolveKey.mockResolvedValue("ag-test");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "not json" } }],
        }),
      text: () => Promise.resolve(""),
    });
    const { runCompilerAgent } = await import("../agents/compiler");
    const res = await runCompilerAgent({ brief, hardData });
    expect(res.draft.candidateBullets.length).toBeGreaterThan(0);
    expect(res.errorMessage).toMatch(/json_parse|parse_failed/);
  });
});
