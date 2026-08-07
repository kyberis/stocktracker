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
}));

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
