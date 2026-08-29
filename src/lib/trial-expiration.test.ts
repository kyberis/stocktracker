import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription")>();
  return {
    ...actual,
    canAccessTheme: vi.fn().mockReturnValue(true),
  };
});

vi.mock("@/lib/notification-templates", () => ({
  planExpiredNotification: vi.fn().mockReturnValue({ type: "plan_expired", title: "Plan expired" }),
}));

vi.mock("@/lib/email", () => ({
  sendTrialExpiredEmail: vi.fn().mockResolvedValue({ success: true }),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

import { ensureInitialized } from "@/lib/db/client";
import { isFeatureEnabled, updateUserSubscription } from "@/lib/db";
import {
  isDueTrialExpirationCandidate,
  maybeExpireTrialOnLogin,
} from "./trial-expiration";

const mockClient = { execute: vi.fn() };

function trialUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@test.com",
    display_name: "Alice",
    trial_activated_at: "2026-03-10T10:00:00.000Z",
    plan: "pro" as const,
    plan_expires_at: "2020-01-01T00:00:00.000Z",
    trial_expired_notified: 0,
    plan_before_trial: "free",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureInitialized).mockResolvedValue(mockClient as never);
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  mockClient.execute.mockResolvedValue({ rows: [] });
});

describe("isDueTrialExpirationCandidate", () => {
  it("is true for an expired unpaid trial that has not been notified", () => {
    expect(isDueTrialExpirationCandidate(trialUser())).toBe(true);
  });

  it("is false when there is no trial", () => {
    expect(isDueTrialExpirationCandidate(trialUser({ trial_activated_at: "" }))).toBe(false);
  });

  it("is false when expiry is still in the future", () => {
    expect(
      isDueTrialExpirationCandidate(trialUser({ plan_expires_at: "2099-01-01T00:00:00.000Z" })),
    ).toBe(false);
  });

  it("is false after the expiration email has already been sent", () => {
    expect(isDueTrialExpirationCandidate(trialUser({ trial_expired_notified: 1 }))).toBe(false);
  });
});

describe("maybeExpireTrialOnLogin", () => {
  it("is a no-op for users without a due trial", async () => {
    const result = await maybeExpireTrialOnLogin(
      trialUser({ trial_activated_at: "", plan_expires_at: "" }),
    );
    expect(result).toEqual({ expired: false, plan: "pro" });
    expect(updateUserSubscription).not.toHaveBeenCalled();
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("downgrades a due trial and returns free", async () => {
    const result = await maybeExpireTrialOnLogin(trialUser());
    expect(result).toEqual({ expired: true, plan: "free" });
    expect(updateUserSubscription).toHaveBeenCalledWith("u1", { plan: "free", planExpiresAt: "" });
  });

  it("does not persist when the trial flag is off", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    const result = await maybeExpireTrialOnLogin(trialUser());
    expect(result).toEqual({ expired: false, plan: "free" });
    expect(updateUserSubscription).not.toHaveBeenCalled();
  });
});
