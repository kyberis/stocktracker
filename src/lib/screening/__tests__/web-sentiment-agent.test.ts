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
  riskProfile: "balanced" as const,
};

const candidate = {
  ticker: "AAPL",
  name: "Apple",
  sector: "Technology",
  industry: "Consumer Electronics",
  country: "US",
  marketCapUsd: 3_000_000_000_000,
  price: 200,
  rankScore: 90,
  rankReason: "Durable ecosystem",
};

describe("runWebSentimentAgent", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockResolveKey.mockReset();
  });

  it("falls back when the gateway has no key", async () => {
    mockResolveKey.mockResolvedValue(null);
    const { runWebSentimentAgent } = await import("../agents/web-sentiment");
    const res = await runWebSentimentAgent({
      ticker: "AAPL",
      brief,
      hardDataCandidate: candidate,
      evidence: { news: [] },
    });
    expect(res.output.ticker).toBe("AAPL");
    expect(res.output.gaps).toContain("llm_or_sources_unavailable");
    expect(res.errorMessage).toBe("gateway_not_configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("coerces a valid tool call into the schema", async () => {
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
                        ticker: "AAPL",
                        signals: [
                          {
                            kind: "tailwind",
                            claim: "Services growth remains strong",
                            confirmation: "confirmed",
                            sources: [
                              {
                                url: "https://example.com/a",
                                asOf: "2026-08-01",
                              },
                            ],
                          },
                        ],
                        insiderSummary: {
                          netBias: "buying",
                          notes: "Cluster buys in last 90d",
                          sources: [],
                        },
                        sentimentSummary: "Constructive near-term tone.",
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
    const { runWebSentimentAgent } = await import("../agents/web-sentiment");
    const res = await runWebSentimentAgent({
      ticker: "AAPL",
      brief,
      hardDataCandidate: candidate,
      evidence: { news: [] },
    });
    expect(res.output.sentimentSummary).toMatch(/Constructive/);
    expect(res.output.signals[0]?.kind).toBe("tailwind");
    expect(res.output.insiderSummary.netBias).toBe("buying");
    expect(res.errorMessage).toBeNull();
  });

  it("falls back when the LLM returns unparseable content", async () => {
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
    const { runWebSentimentAgent } = await import("../agents/web-sentiment");
    const res = await runWebSentimentAgent({
      ticker: "AAPL",
      brief,
      hardDataCandidate: candidate,
      evidence: {},
    });
    expect(res.output.gaps).toContain("llm_or_sources_unavailable");
    expect(res.errorMessage).toMatch(/json_parse|parse_failed/);
  });
});
