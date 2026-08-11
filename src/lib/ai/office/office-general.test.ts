import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuotaByUserId: vi.fn(),
}));

vi.mock("@/lib/feature-quotas", () => ({
  refundFeatureQuota: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkWarrenEmptyAddRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    resetAt: "",
    retryAfterSec: 0,
  }),
}));

vi.mock("@/lib/ai/warren/build-snapshot", () => ({
  buildPortfolioSnapshot: vi.fn(),
}));

vi.mock("@/lib/ai/warren/run-turn", () => ({
  runWarrenTurn: vi.fn(),
}));

vi.mock("@/lib/ai/warren/warren-prefetch-appendix", () => ({
  buildWarrenPrefetchAppendix: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/agent-office", () => ({
  listOfficeMessages: vi.fn(),
  appendOfficeMessage: vi.fn(),
}));

import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { checkWarrenEmptyAddRateLimit } from "@/lib/rate-limit";
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

const mockAiConsultQuota = {
  allowed: true as const,
  feature: "ai_consult" as const,
  plan: "pro" as const,
  used: 1,
  limit: 100,
  remaining: 99,
  resetAt: "2026-06-01T00:00:00.000Z",
  window: "month" as const,
};

describe("handleGeneralOfficeQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireFeatureQuotaByUserId).mockResolvedValue({
      allowed: true,
      quota: mockAiConsultQuota,
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
        officeIdentity: baseInput.identity,
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

  it("blocks empty-portfolio chats during the add-stock cooldown", async () => {
    vi.mocked(buildPortfolioSnapshot).mockResolvedValue({
      baseCurrency: "EUR",
      totals: { value: 0, cost: 0, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });
    vi.mocked(checkWarrenEmptyAddRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetAt: "2026-08-11T12:15:00.000Z",
      retryAfterSec: 900,
    });
    const persist = vi.fn();

    await handleGeneralOfficeQuery(baseInput, "en", () => "2026-05-23T15:01:00Z", persist, vi.fn());

    expect(runWarrenTurn).not.toHaveBeenCalled();
    expect(refundFeatureQuota).toHaveBeenCalledWith("u1", "ai_consult");
    expect(persist).toHaveBeenCalledWith(
      baseInput,
      "warren",
      expect.stringContaining("15-minute break"),
      expect.any(String),
    );
  });
});
