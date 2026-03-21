import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  updateUserSubscription: vi.fn(),
  getUserSettings: vi.fn().mockResolvedValue({ language: "en", dashboardTheme: "default" }),
  updateUserSettings: vi.fn(),
  createNotification: vi.fn(),
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/subscription", () => ({
  canAccessTheme: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/notification-templates", () => ({
  planExpiredNotification: vi.fn().mockReturnValue({ type: "plan_expired", title: "Plan expired" }),
}));

vi.mock("@/lib/email", () => ({
  sendTrialExpiredEmail: vi.fn().mockResolvedValue({ success: true }),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

vi.mock("@/lib/cron-logging", () => ({
  withCronLogging: (_name: string, handler: () => Promise<unknown>) =>
    async () => Response.json(await handler()),
  verifyCronAuth: vi.fn().mockReturnValue(null),
}));

import { ensureInitialized } from "@/lib/db/client";
import { updateUserSubscription, createNotification, isFeatureEnabled } from "@/lib/db";
import { canAccessTheme } from "@/lib/subscription";
import { sendTrialExpiredEmail } from "@/lib/email";

const mockedEnsureInit = vi.mocked(ensureInitialized);
const mockedUpdateSub = vi.mocked(updateUserSubscription);
const mockedCreateNotif = vi.mocked(createNotification);
const mockedCanAccessTheme = vi.mocked(canAccessTheme);
const mockedSendExpired = vi.mocked(sendTrialExpiredEmail);
const mockedIsFeatureEnabled = vi.mocked(isFeatureEnabled);

const mockClient = {
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
  mockedCanAccessTheme.mockReturnValue(true);
  mockedIsFeatureEnabled.mockResolvedValue(true);
});

function mockUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@test.com",
    display_name: "Alice",
    experience_level: "beginner",
    trial_activated_at: "2026-03-10 10:00:00",
    ...overrides,
  };
}

function setupMockExecute(users: Record<string, unknown>[], snapshots?: { start?: number; end?: number }) {
  // 1. Main user query
  mockClient.execute.mockResolvedValueOnce({ rows: users });
  if (users.length === 0) return;
  for (let i = 0; i < users.length; i++) {
    // 2. UPDATE trial_expired_notified
    mockClient.execute.mockResolvedValueOnce({ rows: [] });
    // 3. SELECT start snapshot
    const startRows = snapshots?.start != null ? [{ total_value_eur: snapshots.start }] : [];
    mockClient.execute.mockResolvedValueOnce({ rows: startRows });
    // 4. SELECT end snapshot
    const endRows = snapshots?.end != null ? [{ total_value_eur: snapshots.end }] : [];
    mockClient.execute.mockResolvedValueOnce({ rows: endRows });
  }
}

describe("trial-expiration cron", () => {
  it("downgrades expired trial users and passes growthPct", async () => {
    setupMockExecute([mockUserRow()], { start: 1000, end: 1050 });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.expired).toBe(1);
    expect(body.errors).toBe(0);
    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", { plan: "free", planExpiresAt: "" });
    expect(mockedCreateNotif).toHaveBeenCalled();
    expect(mockedSendExpired).toHaveBeenCalledWith("a@test.com", "Alice", "en", "u1", 5);
  });

  it("sends undefined growthPct when no snapshots exist", async () => {
    setupMockExecute([mockUserRow()]);

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    await (mod.GET as (req: NextRequest) => Promise<Response>)(req);

    expect(mockedSendExpired).toHaveBeenCalledWith("a@test.com", "Alice", "en", "u1", undefined);
  });

  it("sends negative growthPct when portfolio decreased", async () => {
    setupMockExecute([mockUserRow()], { start: 1000, end: 900 });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    await (mod.GET as (req: NextRequest) => Promise<Response>)(req);

    expect(mockedSendExpired).toHaveBeenCalledWith("a@test.com", "Alice", "en", "u1", -10);
  });

  it("sends undefined growthPct when portfolio stayed flat", async () => {
    setupMockExecute([mockUserRow()], { start: 1000, end: 1000 });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    await (mod.GET as (req: NextRequest) => Promise<Response>)(req);

    expect(mockedSendExpired).toHaveBeenCalledWith("a@test.com", "Alice", "en", "u1", undefined);
  });

  it("queries snapshots using trial_activated_at date", async () => {
    setupMockExecute([mockUserRow({ trial_activated_at: "2026-03-14 08:30:00" })], { start: 500, end: 600 });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    await (mod.GET as (req: NextRequest) => Promise<Response>)(req);

    const startSnapCall = mockClient.execute.mock.calls[2];
    expect(startSnapCall[0].args).toContain("2026-03-14");
  });

  it("resets theme when not accessible on free plan", async () => {
    mockedCanAccessTheme.mockReturnValue(false);
    setupMockExecute([mockUserRow()]);

    const { updateUserSettings } = await import("@/lib/db");

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    await (mod.GET as (req: NextRequest) => Promise<Response>)(req);

    expect(vi.mocked(updateUserSettings)).toHaveBeenCalledWith("u1", { dashboardTheme: "default" });
  });

  it("handles empty result set", async () => {
    setupMockExecute([]);

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.expired).toBe(0);
    expect(body.errors).toBe(0);
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });

  it("skips when feature flag is disabled", async () => {
    mockedIsFeatureEnabled.mockResolvedValue(false);

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/trial-expiration");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.skipped).toBe(true);
    expect(body.reason).toBe("pro_trial_enabled flag is off");
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });
});
