import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuotaByUserId: vi.fn(),
}));

vi.mock("@/lib/feature-quotas", () => ({
  refundFeatureQuota: vi.fn(),
}));

vi.mock("@/lib/ai/warren/build-snapshot", () => ({
  buildPortfolioSnapshot: vi.fn(),
}));

vi.mock("@/lib/ai/warren/run-turn", () => ({
  runWarrenTurn: vi.fn(),
}));

vi.mock("@/lib/db/agent-office", () => ({
  listOfficeMessages: vi.fn(),
  appendOfficeMessage: vi.fn(),
}));

import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import { appendOfficeMessage, listOfficeMessages } from "@/lib/db/agent-office";
import { handleGeneralOfficeQuery } from "./office-general";
import type { RunOfficeOrchestrationInput } from "./orchestrator";

const baseInput: RunOfficeOrchestrationInput = {
  userId: "u1",
  identity: { trefolioUserId: "u1", idpSub: "sub1", email: "a@test.com" },
  userMessage: "mostrame mis inversiones la semana pasada",
  baseCurrency: "EUR",
  language: "es",
  subscriptionPlan: "pro",
};

describe("handleGeneralOfficeQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireFeatureQuotaByUserId).mockResolvedValue({
      allowed: true,
      quota: { allowed: true, used: 1, limit: 100, resetAt: "" },
    });
    vi.mocked(listOfficeMessages).mockResolvedValue([
      { id: "1", userId: "u1", role: "user", content: baseInput.userMessage, createdAt: "2026-05-23T15:00:00Z" },
    ]);
    vi.mocked(buildPortfolioSnapshot).mockResolvedValue({
      baseCurrency: "EUR",
      totals: { value: 1000, cost: 900, gainLoss: 100, gainLossPct: 11, dayChange: 0 },
      holdingsCount: 1,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });
  });

  it("runs Warren AI for free-form questions", async () => {
    vi.mocked(runWarrenTurn).mockResolvedValue({
      text: "La semana pasada tu cartera subió ~2%.",
      parts: [],
      proposals: [],
      totalTokens: 10,
      durationMs: 100,
    });

    const frames: unknown[] = [];
    const result = await handleGeneralOfficeQuery(
      baseInput,
      "es",
      () => "2026-05-23T15:01:00Z",
      vi.fn(),
      (frame) => frames.push(frame),
    );

    expect(result.mission).toBeNull();
    expect(runWarrenTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "office",
        userId: "u1",
        messages: [{ role: "user", content: baseInput.userMessage }],
      }),
    );
    expect(appendOfficeMessage).toHaveBeenCalledWith("u1", "warren", "La semana pasada tu cartera subió ~2%.", expect.any(String));
    expect(frames.some((f) => (f as { kind: string }).kind === "message")).toBe(true);
  });

  it("returns quota message when ai_consult limit exceeded", async () => {
    vi.mocked(requireFeatureQuotaByUserId).mockResolvedValue({
      allowed: false,
      reason: "quota_exceeded",
    });
    const persist = vi.fn();

    await handleGeneralOfficeQuery(baseInput, "es", () => "2026-05-23T15:01:00Z", persist, vi.fn());

    expect(runWarrenTurn).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(baseInput, "warren", expect.stringContaining("límite mensual"), expect.any(String));
  });
});
