import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuota: vi.fn(),
}));
vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));
vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  listPortfolios: vi.fn(),
  resolveAiModelForUserPlan: vi.fn(),
  insertAiLog: vi.fn(),
  incrementAiUsage: vi.fn(),
  incrementDailyAiUsage: vi.fn(),
  incrementAiTokenUsage: vi.fn(),
  incrementDailyAiTokenUsage: vi.fn(),
  incrementGlobalAiCalls: vi.fn(),
  incrementGlobalAiTokens: vi.fn(),
}));
vi.mock("@/lib/ai/gateway", () => ({
  resolveGatewayApiKey: vi.fn(),
  fetchGatewayChatCompletions: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkAiRateLimit: vi.fn(),
  checkGlobalAiCap: vi.fn(),
}));
vi.mock("@/lib/metrics", () => ({
  aiCallsTotal: { inc: vi.fn() },
  aiRequestDuration: { startTimer: vi.fn(() => () => {}) },
  rateLimitHitsTotal: { inc: vi.fn() },
}));
vi.mock("@/lib/feature-quotas", () => ({
  refundFeatureQuota: vi.fn(),
}));
vi.mock("@/lib/ai/warren/build-snapshot", () => ({
  buildPortfolioSnapshot: vi.fn(),
}));

import { requireFeatureQuota } from "@/lib/auth/guards";
import {
  findUserById,
  listPortfolios,
} from "@/lib/db";
import { resolveGatewayApiKey } from "@/lib/ai/gateway";
import { checkGlobalAiCap } from "@/lib/rate-limit";
import { refundFeatureQuota } from "@/lib/feature-quotas";

const mockedQuota = vi.mocked(requireFeatureQuota);
const mockedFindUser = vi.mocked(findUserById);
const mockedResolveGateway = vi.mocked(resolveGatewayApiKey);
const mockedGlobalCap = vi.mocked(checkGlobalAiCap);
const mockedRefund = vi.mocked(refundFeatureQuota);
const mockedListPortfolios = vi.mocked(listPortfolios);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/portfolio/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuota.mockResolvedValue({
    session: {
      userId: "u-portfolio-ai",
      username: "p",
      email: "p@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "free",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
  mockedFindUser.mockResolvedValue({
    id: "u-portfolio-ai",
    plan: "free",
  } as never);
  mockedGlobalCap.mockResolvedValue({ allowed: true, used: 0, cap: 1_000_000 } as never);
  mockedResolveGateway.mockResolvedValue("ag-test");
  mockedListPortfolios.mockResolvedValue([{ id: "p1", name: "Main", isDefault: true }] as never);
});

describe("POST /api/portfolio/ai-chat", () => {
  it("returns 401 when requireFeatureQuota fails", async () => {
    mockedQuota.mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ messages: [{ role: "user", content: "Hi" }] }),
    );
    expect(res.status).toBe(401);
    expect(mockedRefund).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown root keys (strict)", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: { foo: "bar" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedRefund).toHaveBeenCalledWith("u-portfolio-ai", "ai_consult");
  });

  it("returns 400 for legacy portfolioContext field", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: {
          baseCurrency: "EUR",
          totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
          holdingsCount: 0,
          topHoldings: [],
          allocation: [],
          cashSummary: {},
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty messages", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ messages: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid message role", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "system", content: "Hi" } as { role: string; content: string }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when more than 30 messages", async () => {
    const { POST } = await import("./route");
    const messages = Array.from({ length: 31 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `c${i}`,
    }));
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ messages }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 501 and refunds when AI Gateway is not configured (before body parse would not run)", async () => {
    mockedResolveGateway.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({ messages: [{ role: "user", content: "Hi" }] }),
    );
    expect(res.status).toBe(501);
    expect(mockedRefund).toHaveBeenCalledWith("u-portfolio-ai", "ai_consult");
  });
});
