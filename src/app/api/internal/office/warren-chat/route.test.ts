import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerify = vi.fn();
const mockResolveUser = vi.fn();
const mockSignupUrl = vi.fn(() => "https://trefolio.com/signup");
const mockFindUserById = vi.fn();
const mockListPortfolios = vi.fn();
const mockBuildSnapshot = vi.fn();
const mockRunWarrenTurn = vi.fn();
const mockResolveIdentity = vi.fn();
const mockEffectivePlan = vi.fn(() => "free");

vi.mock("@/lib/idp/service-auth", () => ({
  verifyIdpServiceBearer: (...args: unknown[]) => mockVerify(...args),
}));
vi.mock("@/lib/ai/office/resolve-clara-warren-user", () => ({
  resolveClaraWarrenUser: (...args: unknown[]) => mockResolveUser(...args),
  trefolioPublicSignupUrl: () => mockSignupUrl(),
}));
vi.mock("@/lib/db", () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  listPortfolios: (...args: unknown[]) => mockListPortfolios(...args),
}));
vi.mock("@/lib/ai/warren/build-snapshot", () => ({
  buildPortfolioSnapshot: (...args: unknown[]) => mockBuildSnapshot(...args),
}));
vi.mock("@/lib/ai/warren/run-turn", () => ({
  runWarrenTurn: (...args: unknown[]) => mockRunWarrenTurn(...args),
}));
vi.mock("@/lib/ai/office/office-identity", () => ({
  resolveOfficeIdentity: (...args: unknown[]) => mockResolveIdentity(...args),
}));
vi.mock("@/lib/ai/office/clara-client", () => ({
  fetchClaraSavingsSummary: vi.fn(async () => ({
    available: true,
    emergencyBalanceEur: 1000,
    surplusEur: 200,
    monthKey: "2026-08",
    dayOfMonth: 26,
    daysInMonth: 31,
    hasMonthRecord: true,
    currency: "EUR",
  })),
}));
vi.mock("@/lib/subscription", () => ({
  effectivePlan: () => mockEffectivePlan(),
}));
vi.mock("@/lib/ai/prompt-safety", () => ({
  sanitizeWarrenPortfolioLabel: (s: string) => s,
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/internal/office/warren-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/office/warren-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockReturnValue(true);
    mockListPortfolios.mockResolvedValue([{ id: "p1", name: "Main", isDefault: true }]);
    mockFindUserById.mockResolvedValue({
      id: "u1",
      plan: "free",
      plan_expires_at: "",
    });
    mockBuildSnapshot.mockResolvedValue({
      holdingsCount: 1,
      totals: { value: 100 },
    });
    mockResolveIdentity.mockResolvedValue({
      idpSub: "sub1",
      email: "a@test.com",
      trefolioUserId: "u1",
    });
    mockRunWarrenTurn.mockResolvedValue({
      text: "You hold AAPL.",
      parts: [],
      proposals: [],
      totalTokens: 10,
      durationMs: 5,
    });
  });

  it("returns 401 without a valid service token", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeRequest({ billingSource: "clara", message: "hi" }));
    expect(res.status).toBe(401);
    expect(mockRunWarrenTurn).not.toHaveBeenCalled();
  });

  it("returns 404 with signup URL when the user has no trefolio account", async () => {
    mockResolveUser.mockResolvedValue(null);
    const res = await POST(
      makeRequest({ billingSource: "clara", sub: "missing", email: "x@test.com", message: "my stocks" }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.hasAccount).toBe(false);
    expect(body.signupUrl).toBe("https://trefolio.com/signup");
    expect(mockRunWarrenTurn).not.toHaveBeenCalled();
  });

  it("runs Warren without consuming ai_consult", async () => {
    mockResolveUser.mockResolvedValue("u1");
    const res = await POST(
      makeRequest({
        billingSource: "clara",
        sub: "sub1",
        email: "a@test.com",
        message: "mis inversiones",
        language: "es",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.text).toBe("You hold AAPL.");
    expect(mockRunWarrenTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        channel: "clara",
        language: "es",
        systemAppendix: expect.stringContaining("Clara cashflow snapshot"),
      }),
    );
  });
});
