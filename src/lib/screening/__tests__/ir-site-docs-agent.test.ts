import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFetchFmp,
  mockFetchIrDocs,
  mockGetResearch,
  mockIsFeature,
  mockGetHardData,
  mockFetchGateway,
  mockResolveKey,
  mockBuildQaHint,
} = vi.hoisted(() => ({
  mockFetchFmp: vi.fn(),
  mockFetchIrDocs: vi.fn(),
  mockGetResearch: vi.fn(),
  mockIsFeature: vi.fn(),
  mockGetHardData: vi.fn(),
  mockFetchGateway: vi.fn(),
  mockResolveKey: vi.fn(),
  mockBuildQaHint: vi.fn(),
}));

vi.mock("@/lib/screening/data/fmp-ir", async () => {
  const actual = await vi.importActual<typeof import("@/lib/screening/data/fmp-ir")>(
    "@/lib/screening/data/fmp-ir",
  );
  return {
    ...actual,
    fetchFmpIrBundle: mockFetchFmp,
  };
});

vi.mock("@/lib/screening/data/ir-site-docs", () => ({
  fetchIrSiteDocuments: mockFetchIrDocs,
}));

vi.mock("@/lib/screening/data/company-research", () => ({
  getOrFetchCompanyResearch: mockGetResearch,
}));

vi.mock("@/lib/db/settings", () => ({
  isFeatureEnabledForUser: mockIsFeature,
}));

vi.mock("@/lib/db", () => ({
  getLatestScreeningAgentOutputUnscoped: mockGetHardData,
  insertAiLog: vi.fn().mockResolvedValue("log-1"),
  insertScreeningAgentOutput: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/ai/gateway", () => ({
  fetchGatewayChatCompletions: mockFetchGateway,
  resolveGatewayApiKey: mockResolveKey,
}));

vi.mock("@/lib/screening/resolve-model", () => ({
  resolveScreeningGatewayModel: vi.fn().mockResolvedValue("openai/gpt-4o-mini"),
}));

vi.mock("@/lib/screening/qa/hint", () => ({
  buildQaHintBlock: mockBuildQaHint,
}));

vi.mock("@/lib/screening/cost", async () => {
  const actual = await vi.importActual<typeof import("@/lib/screening/cost")>(
    "@/lib/screening/cost",
  );
  return {
    ...actual,
    accrueScreeningLlmCost: vi.fn().mockResolvedValue(undefined),
  };
});

const briefJson = JSON.stringify({
  intent: "analyze",
  includeSectors: [],
  excludeSectors: [],
  regions: ["us_canada"],
  candidateCount: 1,
  criteria: [],
  endedEarly: false,
  locale: "en",
  riskProfile: "balanced",
  focusTicker: "TFII",
});

describe("runIrBusinessStep IR site docs", () => {
  beforeEach(() => {
    mockFetchFmp.mockReset();
    mockFetchIrDocs.mockReset();
    mockGetResearch.mockReset();
    mockIsFeature.mockReset();
    mockGetHardData.mockReset();
    mockFetchGateway.mockReset();
    mockResolveKey.mockReset();
    mockBuildQaHint.mockReset();

    mockIsFeature.mockResolvedValue(true);
    mockBuildQaHint.mockResolvedValue("");
    mockResolveKey.mockResolvedValue("ag-test");
    mockGetHardData.mockResolvedValue({
      outputJson: JSON.stringify({
        candidates: [
          {
            ticker: "TFII",
            name: "TFI International",
            sector: "Industrials",
            industry: "Trucking",
            country: "CA",
            marketCapUsd: 10_000_000_000,
            price: 100,
            rankScore: 80,
            rankReason: "Solid",
          },
        ],
        generatedAt: new Date().toISOString(),
      }),
    });
    mockFetchGateway.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      ticker: "TFII",
                      businessOneLiner: "North American trucking consolidator.",
                      guidance: {
                        summary: "Raised outlook",
                        direction: "up",
                        asOf: "2026-04-24",
                        sources: [
                          {
                            url: "https://investors.tfiintl.com/news/q1",
                            asOf: "2026-04-24",
                            label: "Q1 release",
                          },
                        ],
                      },
                      catalysts: [],
                      segments: ["LTL"],
                      contradictionWithHardData: false,
                      confidence: "medium",
                      bullets: ["b1", "b2", "b3"],
                      gaps: [],
                    }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    });
  });

  it("does not call Tavily Research when IR extract has useful content", async () => {
    mockFetchFmp.mockResolvedValue({
      ticker: "TFII",
      transcript: null,
      news: [],
      insiders: [],
      requestCount: 0,
      errors: [],
    });
    mockFetchIrDocs.mockResolvedValue({
      ticker: "TFII",
      irPageUrl: "https://investors.tfiintl.com/",
      documents: [
        {
          url: "https://investors.tfiintl.com/news/q1",
          title: "Q1",
          asOf: "2026-04-24",
          excerpt: "x".repeat(200),
          role: "document",
          format: "html",
        },
      ],
      hasUsefulContent: true,
      searchCredits: 2,
      extractCredits: 1,
      errors: [],
    });

    const { runIrBusinessStep } = await import("../agents/ir-business");
    const result = await runIrBusinessStep({
      step: {
        id: "s1",
        runId: "run-1",
        agentKind: "ir_business",
        ticker: "TFII",
        status: "running",
        attempts: 1,
        leaseOwner: "w",
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userId: "u1",
      runId: "run-1",
      briefJson,
    });

    expect(result).toMatchObject({ status: "ok" });
    if (result.status !== "ok") {
      throw new Error(`unexpected: ${JSON.stringify(result)}`);
    }
    expect(mockFetchIrDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "TFII",
        preferSerperJina: true,
        forceSerperJina: true,
      }),
    );
    expect(mockGetResearch).not.toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      irSiteDocsUsed: true,
      researchUsed: false,
      irPageUrl: "https://investors.tfiintl.com/",
      documents: [
        expect.objectContaining({
          url: "https://investors.tfiintl.com/news/q1",
        }),
      ],
    });
  });

  it("calls Research fallback when FMP is thin and extract is empty", async () => {
    mockFetchFmp.mockResolvedValue({
      ticker: "TFII",
      transcript: null,
      news: [],
      insiders: [],
      requestCount: 0,
      errors: [],
    });
    mockFetchIrDocs.mockResolvedValue({
      ticker: "TFII",
      irPageUrl: null,
      documents: [],
      hasUsefulContent: false,
      searchCredits: 2,
      extractCredits: 0,
      errors: ["no_ir_candidates"],
    });
    mockGetResearch.mockResolvedValue({
      ticker: "TFII",
      businessOneLiner: "Trucking",
      segments: [],
      catalysts: [],
      guidanceSummary: "",
      competitors: [],
      sources: [{ title: "x", url: "https://example.com" }],
      rawContent: "research",
      model: "mini",
      creditsUsed: 20,
      requestId: "r1",
      errors: [],
      latencyMs: 1,
      fromCache: false,
    });

    const { runIrBusinessStep } = await import("../agents/ir-business");
    const result = await runIrBusinessStep({
      step: {
        id: "s2",
        runId: "run-2",
        agentKind: "ir_business",
        ticker: "TFII",
        status: "running",
        attempts: 1,
        leaseOwner: "w",
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userId: "u1",
      runId: "run-2",
      briefJson,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(mockGetResearch).toHaveBeenCalledWith(
      expect.objectContaining({ cacheOnly: true }),
    );
    expect(result.payload).toMatchObject({ researchUsed: true });
  });

  it("uses researchTicker for FMP IR and IR site search", async () => {
    mockGetHardData.mockResolvedValue({
      outputJson: JSON.stringify({
        status: "ok",
        universeSize: 1,
        locale: "en",
        candidates: [
          {
            ticker: "W9C.MU",
            name: "Constellation Software Inc.   R",
            sector: "Technology",
            industry: "Software",
            country: "CA",
            marketCapUsd: 70_000_000_000,
            price: 3000,
            rankScore: 100,
            rankReason: "Analyze",
            researchTicker: "CSU.TO",
          },
        ],
      }),
    });
    mockFetchFmp.mockResolvedValue({
      ticker: "CSU.TO",
      transcript: { year: 2026, quarter: 2, date: "2026-08-11", excerpt: "x".repeat(250) },
      news: [{ title: "Q2", publishedDate: "2026-08-11", url: "https://example.com", site: null }],
      insiders: [],
      requestCount: 2,
      errors: [],
    });
    mockFetchIrDocs.mockResolvedValue({
      ticker: "CSU.TO",
      irPageUrl: "https://www.csisoftware.com/investor-relations/",
      documents: [
        {
          url: "https://www.csisoftware.com/q2.pdf",
          title: "Q2",
          asOf: "2026-08-11",
          excerpt: "x".repeat(200),
          role: "document",
          format: "pdf",
        },
      ],
      hasUsefulContent: true,
      searchCredits: 2,
      extractCredits: 2,
      errors: [],
    });

    const { runIrBusinessStep } = await import("../agents/ir-business");
    const result = await runIrBusinessStep({
      step: {
        id: "s3",
        runId: "run-3",
        agentKind: "ir_business",
        ticker: "W9C.MU",
        status: "running",
        attempts: 1,
        leaseOwner: "w",
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userId: "u1",
      runId: "run-3",
      briefJson,
    });

    expect(result.status).toBe("ok");
    expect(mockFetchFmp).toHaveBeenCalledWith({ ticker: "CSU.TO" });
    expect(mockFetchIrDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "CSU.TO",
        companyName: "Constellation Software Inc.",
        preferSerperJina: true,
        forceSerperJina: true,
      }),
    );
    if (result.status === "ok") {
      expect(result.payload).toMatchObject({
        ticker: "W9C.MU",
        researchTicker: "CSU.TO",
        irSiteDocsUsed: true,
      });
    }
  });

  it("does not force Serper/Jina on explore briefs", async () => {
    mockIsFeature.mockImplementation(async (flag: string) => {
      if (flag === "screening_analyze_force_serper_jina_enabled") return true;
      if (flag === "screening_ir_serper_jina_enabled") return false;
      return true;
    });
    mockFetchFmp.mockResolvedValue({
      ticker: "TFII",
      transcript: null,
      news: [],
      insiders: [],
      requestCount: 0,
      errors: [],
    });
    mockFetchIrDocs.mockResolvedValue({
      ticker: "TFII",
      irPageUrl: "https://investors.tfiintl.com/",
      documents: [
        {
          url: "https://investors.tfiintl.com/news/q1",
          title: "Q1",
          asOf: "2026-04-24",
          excerpt: "x".repeat(200),
          role: "document",
          format: "html",
        },
      ],
      hasUsefulContent: true,
      searchCredits: 2,
      extractCredits: 1,
      errors: [],
    });

    const { runIrBusinessStep } = await import("../agents/ir-business");
    await runIrBusinessStep({
      step: {
        id: "s4",
        runId: "run-4",
        agentKind: "ir_business",
        ticker: "TFII",
        status: "running",
        attempts: 1,
        leaseOwner: "w",
        leaseExpiresAt: null,
        dependsOn: [],
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userId: "u1",
      runId: "run-4",
      briefJson: JSON.stringify({
        intent: "explore",
        includeSectors: [],
        excludeSectors: [],
        regions: ["us_canada"],
        candidateCount: 3,
        criteria: [],
        endedEarly: false,
        locale: "en",
      }),
    });

    expect(mockFetchIrDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        preferSerperJina: false,
        forceSerperJina: false,
      }),
    );
  });
});
