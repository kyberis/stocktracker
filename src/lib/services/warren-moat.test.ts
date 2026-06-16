import { describe, it, expect, vi, beforeEach } from "vitest";

import { getWarrenMoatEvaluation } from "@/lib/services/warren-moat";

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
