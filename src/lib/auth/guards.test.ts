import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./session", () => ({
  getSessionFromRequest: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  getAiUsage: vi.fn(),
  getAiTokenUsage: vi.fn(),
  trackEvent: vi.fn().mockResolvedValue(undefined),
  updateLastActive: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/subscription", () => ({
  canAccessFeature: vi.fn(),
  effectivePlan: vi.fn(),
}));
vi.mock("@/lib/metrics", () => ({
  paywallHitsTotal: { inc: vi.fn() },
  rateLimitHitsTotal: { inc: vi.fn() },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkAvRateLimit: vi.fn(),
  checkAiRateLimit: vi.fn(),
  checkAiImportRateLimit: vi.fn(),
}));

import { getSessionFromRequest } from "./session";
import { findUserById, getAiUsage, getAiTokenUsage, updateLastActive } from "@/lib/db";
import { canAccessFeature, effectivePlan } from "@/lib/subscription";
import { checkAvRateLimit, checkAiRateLimit, checkAiImportRateLimit } from "@/lib/rate-limit";
import { requireSession, requireAdmin, requirePro, requireFeatureAccess, requireRateLimit } from "./guards";

const mockGetSession = getSessionFromRequest as unknown as ReturnType<typeof vi.fn>;
const mockFindUser = findUserById as unknown as ReturnType<typeof vi.fn>;
const mockGetAiUsage = getAiUsage as unknown as ReturnType<typeof vi.fn>;
const mockGetAiTokenUsage = getAiTokenUsage as unknown as ReturnType<typeof vi.fn>;
const mockCanAccess = canAccessFeature as unknown as ReturnType<typeof vi.fn>;
const mockEffectivePlan = effectivePlan as unknown as ReturnType<typeof vi.fn>;
const mockCheckAv = checkAvRateLimit as unknown as ReturnType<typeof vi.fn>;
const mockCheckAi = checkAiRateLimit as unknown as ReturnType<typeof vi.fn>;
const mockCheckImport = checkAiImportRateLimit as unknown as ReturnType<typeof vi.fn>;

const fakeReq = {} as any;
const userSession = { userId: "u1", username: "test", email: "t@t.com", role: "user", plan: "free", mustChangePassword: false, emailVerified: true, onboardingCompleted: true };
const adminSession = { ...userSession, role: "admin" };
const proSession = { ...userSession, plan: "pro" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { session, error } = await requireSession(fakeReq);
    expect(session).toBeNull();
    expect(error).toBeTruthy();
    const body = await error!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns session when valid", async () => {
    mockGetSession.mockResolvedValue(userSession);
    const { session, error } = await requireSession(fakeReq);
    expect(error).toBeNull();
    expect(session!.userId).toBe("u1");
  });

  it("does not bump last active while impersonating", async () => {
    mockGetSession.mockResolvedValue({ ...userSession, impersonatorUserId: "admin-1" });
    vi.mocked(updateLastActive).mockClear();
    await requireSession(fakeReq);
    expect(updateLastActive).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { error } = await requireAdmin(fakeReq);
    expect(error).toBeTruthy();
  });

  it("returns 403 for non-admin user", async () => {
    mockGetSession.mockResolvedValue(userSession);
    const { session, error } = await requireAdmin(fakeReq);
    expect(session).toBeNull();
    const body = await error!.json();
    expect(body.error).toBe("Forbidden");
  });

  it("allows admin users", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const { session, error } = await requireAdmin(fakeReq);
    expect(error).toBeNull();
    expect(session!.role).toBe("admin");
  });

  it("returns 403 when session is impersonating (defense in depth)", async () => {
    mockGetSession.mockResolvedValue({ ...adminSession, impersonatorUserId: "should-not-happen" });
    const { error } = await requireAdmin(fakeReq);
    expect(error).toBeTruthy();
    const body = await error!.json();
    expect(body.error).toBe("Forbidden");
  });
});

/**
 * Deprecated guards under the universal-access quota model: `requirePro` and
 * `requireFeatureAccess` are now thin shims around `requireSession`. Real
 * gating lives in `requireFeatureQuota`. We assert here that the deprecated
 * guards no longer reject signed-in free users (everyone is in).
 */
describe("requirePro (deprecated shim)", () => {
  it("allows free user (universal access)", async () => {
    mockGetSession.mockResolvedValue(userSession);
    const { session, error } = await requirePro(fakeReq);
    expect(error).toBeNull();
    expect(session).toBeTruthy();
  });

  it("allows pro user", async () => {
    mockGetSession.mockResolvedValue(proSession);
    const { session, error } = await requirePro(fakeReq);
    expect(error).toBeNull();
    expect(session).toBeTruthy();
  });

  it("rejects when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { session, error } = await requirePro(fakeReq);
    expect(session).toBeNull();
    expect(error).toBeTruthy();
  });
});

describe("requireFeatureAccess (deprecated shim)", () => {
  it("rejects when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { error } = await requireFeatureAccess(fakeReq, "ai");
    expect(error).toBeTruthy();
    const body = await error!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("allows any signed-in user regardless of feature", async () => {
    mockGetSession.mockResolvedValue(userSession);
    const { session, error } = await requireFeatureAccess(fakeReq, "charts");
    expect(error).toBeNull();
    expect(session).toBeTruthy();
  });

  it("allows even for premium-style features (no plan gating)", async () => {
    mockGetSession.mockResolvedValue(userSession);
    const { session, error } = await requireFeatureAccess(fakeReq, "ai");
    expect(error).toBeNull();
    expect(session).toBeTruthy();
  });
});

describe("requireRateLimit", () => {
  it("allows when rate limit not exceeded (alphavantage)", async () => {
    mockGetSession.mockResolvedValue(userSession);
    mockCheckAv.mockResolvedValue({ allowed: true, remaining: 10, limit: 15, resetAt: "" });
    const { session, error, rateLimit } = await requireRateLimit(fakeReq, "alphavantage");
    expect(error).toBeNull();
    expect(session).toBeTruthy();
    expect(rateLimit!.remaining).toBe(10);
  });

  it("returns 429 when rate limit exceeded (alphavantage)", async () => {
    mockGetSession.mockResolvedValue(userSession);
    mockCheckAv.mockResolvedValue({ allowed: false, remaining: 0, limit: 15, resetAt: "" });
    const { error } = await requireRateLimit(fakeReq, "alphavantage");
    expect(error).toBeTruthy();
    const body = await error!.json();
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfter).toBe(60);
  });

  it("checks AI rate limit for openai provider", async () => {
    mockGetSession.mockResolvedValue(userSession);
    mockFindUser.mockResolvedValue({ plan: "free", plan_expires_at: "" });
    mockEffectivePlan.mockReturnValue("free");
    mockCheckAi.mockResolvedValue({ allowed: true, remaining: 5, limit: 30, resetAt: "" });
    const { error } = await requireRateLimit(fakeReq, "openai");
    expect(error).toBeNull();
    expect(mockCheckAi).toHaveBeenCalledWith("u1", "free");
  });

  it("checks AI import rate limit for openai_import provider", async () => {
    mockGetSession.mockResolvedValue(userSession);
    mockCheckImport.mockResolvedValue({ allowed: true, remaining: 3, limit: 5, resetAt: "" });
    const { error } = await requireRateLimit(fakeReq, "openai_import");
    expect(error).toBeNull();
    expect(mockCheckImport).toHaveBeenCalledWith("u1");
  });

  it("returns 429 with 86400 retry-after for non-AV provider", async () => {
    mockGetSession.mockResolvedValue(userSession);
    mockFindUser.mockResolvedValue({ plan: "free", plan_expires_at: "" });
    mockEffectivePlan.mockReturnValue("free");
    mockCheckAi.mockResolvedValue({ allowed: false, remaining: 0, limit: 30, resetAt: "" });
    const { error } = await requireRateLimit(fakeReq, "openai");
    const body = await error!.json();
    expect(body.retryAfter).toBe(86400);
  });
});
