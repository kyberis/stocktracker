import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetLatest,
  mockInsertOutput,
  mockHeartbeat,
  mockIsFeatureEnabled,
  mockGetOrFetch,
} = vi.hoisted(() => ({
  mockGetLatest: vi.fn(),
  mockInsertOutput: vi.fn(),
  mockHeartbeat: vi.fn(),
  mockIsFeatureEnabled: vi.fn(),
  mockGetOrFetch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getLatestScreeningAgentOutputUnscoped: mockGetLatest,
  insertScreeningAgentOutput: mockInsertOutput,
  heartbeatStepLease: mockHeartbeat,
}));

vi.mock("@/lib/db/settings", () => ({
  isFeatureEnabledForUser: mockIsFeatureEnabled,
}));

vi.mock("@/lib/screening/data/company-research", () => ({
  getOrFetchCompanyResearch: mockGetOrFetch,
}));

vi.mock("@/lib/screening/orchestrator/handlers", () => ({
  registerHandler: vi.fn(),
}));

import { runShortlistResearchStep } from "@/lib/screening/agents/shortlist-research";
import type { HandlerContext } from "@/lib/screening/orchestrator/handlers";

function ctx(): HandlerContext {
  return {
    step: {
      id: "step-sr",
      runId: "run-1",
      agentKind: "shortlist_research",
      ticker: null,
      status: "running",
      attempts: 1,
      leaseOwner: "worker-1",
      leaseExpiresAt: "2026-08-10T22:05:00.000Z",
      dependsOn: [],
      errorMessage: null,
      startedAt: "2026-08-10T22:00:00.000Z",
      completedAt: null,
      createdAt: "2026-08-10T22:00:00.000Z",
      updatedAt: "2026-08-10T22:00:00.000Z",
    },
    userId: "u1",
    runId: "run-1",
    briefJson: "{}",
  };
}

const emptyBundle = {
  ticker: "AAA",
  businessOneLiner: "x",
  segments: [],
  catalysts: [],
  guidanceSummary: "",
  competitors: [],
  sources: [],
  fromCache: false,
  creditsUsed: 1,
  errors: [],
  moatEvidence: "",
  capitalAllocation: "",
  growthDrivers: "",
  addressableMarket: "",
  keyRisks: [],
  analystCoverageNote: "",
  pricingPowerEvidence: "",
  rawContent: "",
  model: "mini" as const,
  requestId: null,
  latencyMs: 10,
};

describe("runShortlistResearchStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockHeartbeat.mockResolvedValue(true);
    mockInsertOutput.mockResolvedValue(undefined);
    mockGetLatest.mockImplementation(async (_runId: string, kind: string) => {
      if (kind === "compiler") {
        return {
          outputJson: JSON.stringify({
            summary: "s",
            candidateBullets: [
              { ticker: "AAA", headline: "A", bullet: "why A" },
              { ticker: "BBB", headline: "B", bullet: "why B" },
              { ticker: "CCC", headline: "C", bullet: "why C" },
            ],
            disclaimer: "not advice",
            locale: "en",
          }),
        };
      }
      return {
        outputJson: JSON.stringify({
          status: "ok",
          universeSize: 3,
          candidates: [
            {
              ticker: "AAA",
              name: "A Co",
              score: 1,
              rationale: "r",
              metrics: {},
            },
            {
              ticker: "BBB",
              name: "B Co",
              score: 1,
              rationale: "r",
              metrics: {},
            },
            {
              ticker: "CCC",
              name: "C Co",
              score: 1,
              rationale: "r",
              metrics: {},
            },
          ],
          locale: "en",
        }),
      };
    });
  });

  it("heartbeats and passes a per-ticker timeout under the wall budget", async () => {
    mockGetOrFetch.mockResolvedValue(emptyBundle);
    const result = await runShortlistResearchStep(ctx());
    expect(result.status).toBe("ok");
    expect(mockHeartbeat).toHaveBeenCalled();
    expect(mockGetOrFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "AAA",
        timeoutMs: expect.any(Number),
        cacheOnly: true,
      }),
    );
    const timeout = mockGetOrFetch.mock.calls[0][0].timeoutMs as number;
    expect(timeout).toBeLessThanOrEqual(55_000);
    expect(result.status === "ok" && result.payload?.truncated).toBe(false);
  });

  it("stops early when the wall budget is exhausted", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mockGetOrFetch.mockImplementation(async () => {
      now += 80_000;
      return { ...emptyBundle, ticker: "AAA" };
    });

    const result = await runShortlistResearchStep(ctx());
    expect(result.status).toBe("ok");
    // First ticker ~80s, second starts with ~70s left; after second (~160s)
    // the third is skipped by the wall budget.
    expect(mockGetOrFetch.mock.calls.length).toBe(2);
    expect(result.status === "ok" && result.payload?.truncated).toBe(true);
  });
});
