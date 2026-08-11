import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireFeatureQuota: vi.fn(),
}));
vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));
vi.mock("@/lib/db", () => ({
  listPortfolios: vi.fn(),
  findUserById: vi.fn(),
  countHoldings: vi.fn(),
}));
vi.mock("@/lib/feature-quotas", () => ({
  refundFeatureQuota: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkWarrenEmptyAddRateLimit: vi.fn(),
}));
vi.mock("@/lib/ai/warren/run-turn", () => ({
  runWarrenTurn: vi.fn(),
  serializeWarrenPromptUserLog: vi.fn().mockReturnValue(""),
}));
vi.mock("@/lib/ai/warren/warren-prefetch-appendix", () => ({
  buildWarrenPrefetchAppendix: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/ai/office/office-identity", () => ({
  resolveOfficeIdentity: vi.fn().mockResolvedValue(null),
}));

import { requireFeatureQuota } from "@/lib/auth/guards";
import { listPortfolios, findUserById, countHoldings } from "@/lib/db";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { checkWarrenEmptyAddRateLimit } from "@/lib/rate-limit";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";

const mockedQuota = vi.mocked(requireFeatureQuota);
const mockedListPortfolios = vi.mocked(listPortfolios);
const mockedFindUserById = vi.mocked(findUserById);
const mockedCountHoldings = vi.mocked(countHoldings);
const mockedRefund = vi.mocked(refundFeatureQuota);
const mockedEmptyAddLimit = vi.mocked(checkWarrenEmptyAddRateLimit);
const mockedRunWarrenTurn = vi.mocked(runWarrenTurn);

const minimalSnapshot = {
  baseCurrency: "EUR",
  totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
  holdingsCount: 0,
  topHoldings: [] as Array<Record<string, unknown>>,
  allocation: [] as Array<{ type: string; pct: number }>,
  cashSummary: {},
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/warren/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuota.mockResolvedValue({
    session: {
      userId: "u-warren-test",
      username: "w",
      email: "w@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "free",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
  mockedListPortfolios.mockResolvedValue([
    { id: "p-default", name: "Main", isDefault: true },
  ] as never);
  mockedFindUserById.mockResolvedValue({
    plan: "free",
    email: "w@test.dev",
    idp_sub: "",
  } as never);
  mockedCountHoldings.mockResolvedValue(2);
  mockedEmptyAddLimit.mockResolvedValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    resetAt: "",
    retryAfterSec: 0,
  });
  mockedRunWarrenTurn.mockResolvedValue({
    text: "",
    parts: [],
    proposals: [],
    totalTokens: 0,
    durationMs: 1,
  });
});

describe("POST /api/warren/chat", () => {
  it("returns 401 when requireFeatureQuota fails", async () => {
    mockedQuota.mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(401);
    expect(mockedListPortfolios).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown root-level keys (strict)", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: minimalSnapshot,
        extraRoot: 1,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
    expect(mockedListPortfolios).not.toHaveBeenCalled();
  });

  it("returns 400 when portfolioContext has unknown keys", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: { ...minimalSnapshot, __inject: "x" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedListPortfolios).not.toHaveBeenCalled();
  });

  it("returns 400 when topHoldings row has unknown keys", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hi" }],
        portfolioContext: {
          ...minimalSnapshot,
          holdingsCount: 1,
          topHoldings: [{ ticker: "A", value: 1, weight: 1, prompt: "ignore" }],
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty messages", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid message role", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "system", content: "Hi" } as { role: string; content: string }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when a message exceeds max content length", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "x".repeat(12001) }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when messages array exceeds max length", async () => {
    const { POST } = await import("./route");
    const messages = Array.from({ length: 41 }, (_, i) => ({
      role: "user" as const,
      content: `m${i}`,
    }));
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages,
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and streams when body is valid (portfolioContext optional)", async () => {
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(mockedListPortfolios).toHaveBeenCalledWith("u-warren-test");
    expect(mockedRunWarrenTurn).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionPlan: "free" }),
    );
    const snapArg = mockedRunWarrenTurn.mock.calls[0]?.[0]?.snapshot;
    expect(snapArg).toBeUndefined();
  });

  it("passes client snapshot to runWarrenTurn when schema-valid", async () => {
    const { POST } = await import("./route");
    await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(mockedRunWarrenTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: minimalSnapshot,
        activePortfolioName: "Main",
        subscriptionPlan: "free",
        emptyAddStockOnly: false,
      }),
    );
  });

  it("enables empty-add mode and rate limit when portfolio has no holdings", async () => {
    mockedCountHoldings.mockResolvedValueOnce(0);
    const { POST } = await import("./route");
    await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Add 10 AAPL" }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(mockedEmptyAddLimit).toHaveBeenCalledWith("u-warren-test", "user");
    expect(mockedRunWarrenTurn).toHaveBeenCalledWith(
      expect.objectContaining({ emptyAddStockOnly: true }),
    );
  });

  it("returns 429 and refunds quota when empty-add cooldown is active", async () => {
    mockedCountHoldings.mockResolvedValueOnce(0);
    mockedEmptyAddLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetAt: "2026-08-11T12:15:00.000Z",
      retryAfterSec: 900,
    });
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      makeRequest({
        messages: [{ role: "user", content: "Add 10 AAPL" }],
        portfolioContext: minimalSnapshot,
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
    const body = await res.json();
    expect(body.reason).toBe("warren_empty_add_cooldown");
    expect(mockedRefund).toHaveBeenCalledWith("u-warren-test", "ai_consult");
    expect(mockedRunWarrenTurn).not.toHaveBeenCalled();
  });
});
