import { describe, it, expect, vi, beforeEach } from "vitest";

import { getWarrenMoatEvaluation, mapWarrenMoatEvaluationForTool } from "@/lib/services/warren-moat";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuotaByUserId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  getMoatCache: vi.fn(),
  upsertMoatCache: vi.fn(),
}));

describe("getWarrenMoatEvaluation", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const db = await import("@/lib/db");
    vi.mocked(db.findUserById).mockResolvedValue({
      id: "u1",
      role: "user",
      plan: "pro",
      plan_expires_at: "",
    } as never);
  });

  it("returns cached evaluation without quota when available", async () => {
    const db = await import("@/lib/db");
    vi.mocked(db.getMoatCache).mockResolvedValue({
      symbol: "KO",
      evaluationJson: JSON.stringify({ symbol: "KO", totalScore: 70 }),
      updatedAt: "2026-01-01",
    } as never);

    const result = await getWarrenMoatEvaluation("u1", "KO");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data._cached).toBe(true);
      expect(result.data.symbol).toBe("KO");
    }
  });

  it("rejects empty symbol", async () => {
    const result = await getWarrenMoatEvaluation("u1", "  ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_input");
  });
});

describe("mapWarrenMoatEvaluationForTool", () => {
  it("maps evaluation fields for Warren tool response", () => {
    const mapped = mapWarrenMoatEvaluationForTool({
      symbol: "KO",
      companyName: "Coca-Cola",
      sector: "Consumer",
      totalScore: 56,
      maxScore: 80,
      verdict: "Moderate Competitive Advantage",
      passedCount: 5,
      criteriaCount: 8,
      valuation: { peRatio: 24.5 },
      _cached: true,
      _cachedAt: "2026-01-01",
    });
    expect(mapped.found).toBe(true);
    expect(mapped.scorePct).toBe(70);
    expect(mapped.peRatio).toBe(24.5);
    expect(mapped.cached).toBe(true);
  });
});
