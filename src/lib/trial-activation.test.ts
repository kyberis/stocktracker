import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  updateUserSubscription: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

import { findUserById, updateUserSubscription } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import {
  activateProTrial,
  getTrialBannerVisibility,
  getTrialEligibilityError,
  getTrialPlanExpiresAt,
  getTrialRepairPlanExpiresAt,
  isLocalTrialActive,
  isTrialEntitlementRepairCandidate,
  TRIAL_DURATION_MS,
} from "./trial-activation";

const mockedFindUser = vi.mocked(findUserById);
const mockedUpdateSub = vi.mocked(updateUserSubscription);
const mockedEnsureInit = vi.mocked(ensureInitialized);

const mockClient = {
  execute: vi.fn().mockResolvedValue({ rows: [] }),
};

const freeUser = {
  id: "u1",
  plan: "free" as const,
  trial_token: "tok",
  trial_activated_at: "",
  trial_invited_at: "",
  stripe_subscription_id: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
});

describe("getTrialEligibilityError", () => {
  it("returns null for eligible free user", () => {
    expect(getTrialEligibilityError(freeUser as never)).toBeNull();
  });

  it("returns already_activated when trial was used", () => {
    expect(
      getTrialEligibilityError({ ...freeUser, trial_activated_at: "2026-01-01" } as never),
    ).toBe("already_activated");
  });

  it("returns not_free_plan for paid users", () => {
    expect(getTrialEligibilityError({ ...freeUser, plan: "pro" } as never)).toBe("not_free_plan");
  });

  it("allows Basic users who never activated", () => {
    expect(getTrialEligibilityError({ ...freeUser, plan: "basic" } as never)).toBeNull();
  });

  it("blocks Stripe subscribers", () => {
    expect(
      getTrialEligibilityError({ ...freeUser, stripe_subscription_id: "sub_1" } as never),
    ).toBe("not_free_plan");
  });

  it("returns invalid_token when token mismatches", () => {
    expect(getTrialEligibilityError(freeUser as never, { token: "wrong" })).toBe("invalid_token");
  });
});

describe("getTrialPlanExpiresAt", () => {
  it("returns ISO date 7 days later", () => {
    const base = Date.parse("2026-01-01T00:00:00.000Z");
    expect(getTrialPlanExpiresAt(base)).toBe("2026-01-08T00:00:00.000Z");
  });
});

describe("activateProTrial", () => {
  it("activates pro plan for eligible user", async () => {
    mockedFindUser.mockResolvedValue(freeUser as never);

    const result = await activateProTrial("u1");

    expect(result.planExpiresAt).toBeDefined();
    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", {
      plan: "pro",
      planExpiresAt: expect.any(String),
    });
    expect(mockClient.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining("trial_activated_at"),
      args: ["free", "u1"],
    });
  });

  it("throws when user not found", async () => {
    mockedFindUser.mockResolvedValue(null);
    await expect(activateProTrial("missing")).rejects.toThrow("user_not_found");
  });

  it("throws when trial already activated", async () => {
    mockedFindUser.mockResolvedValue({ ...freeUser, trial_activated_at: "2026-01-01" } as never);
    await expect(activateProTrial("u1")).rejects.toThrow("already_activated");
  });
});

describe("isLocalTrialActive", () => {
  it("returns true for active local trial", () => {
    expect(
      isLocalTrialActive({
        trial_activated_at: "2027-05-23T00:00:00.000Z",
        plan: "pro",
        plan_expires_at: "2027-05-30T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when trial was never activated", () => {
    expect(
      isLocalTrialActive({
        trial_activated_at: "",
        plan: "free",
        plan_expires_at: "",
      }),
    ).toBe(false);
  });
});

describe("isTrialEntitlementRepairCandidate", () => {
  const activatedAt = "2026-05-23T12:00:00.000Z";
  const nowMs = Date.parse(activatedAt) + 2 * 24 * 60 * 60 * 1000;

  it("returns true when trial was activated but plan was downgraded to free", () => {
    expect(
      isTrialEntitlementRepairCandidate(
        {
          trial_activated_at: activatedAt,
          plan: "free",
          plan_expires_at: "",
          stripe_subscription_id: "",
        },
        nowMs,
      ),
    ).toBe(true);
  });

  it("returns false when trial is already active locally", () => {
    expect(
      isTrialEntitlementRepairCandidate(
        {
          trial_activated_at: activatedAt,
          plan: "pro",
          plan_expires_at: "2027-05-30T12:00:00.000Z",
          stripe_subscription_id: "",
        },
        nowMs,
      ),
    ).toBe(false);
  });

  it("returns false when trial window has ended", () => {
    expect(
      isTrialEntitlementRepairCandidate(
        {
          trial_activated_at: activatedAt,
          plan: "free",
          plan_expires_at: "",
          stripe_subscription_id: "",
        },
        Date.parse(activatedAt) + TRIAL_DURATION_MS + 60_000,
      ),
    ).toBe(false);
  });
});

describe("getTrialRepairPlanExpiresAt", () => {
  it("returns activation plus seven days while still in window", () => {
    const activatedAt = "2026-05-23T12:00:00.000Z";
    expect(getTrialRepairPlanExpiresAt(activatedAt, Date.parse(activatedAt) + 60_000)).toBe(
      "2026-05-30T12:00:00.000Z",
    );
  });
});

describe("getTrialBannerVisibility", () => {
  const activatedAt = "2026-05-23T12:00:00.000Z";

  it("shows active trial even when plan cache is free but activation is recent", () => {
    const result = getTrialBannerVisibility({
      trialActivatedAt: activatedAt,
      plan: "free",
      planExpiresAt: "",
      nowMs: Date.parse(activatedAt) + 2 * 24 * 60 * 60 * 1000,
    });
    expect(result.show).toBe(true);
    expect(result.variant).toBe("active");
  });

  it("does not show banner when trial was never activated", () => {
    expect(
      getTrialBannerVisibility({
        trialActivatedAt: "",
        plan: "free",
        planExpiresAt: "",
        nowMs: Date.now(),
      }).show,
    ).toBe(false);
  });

  it("shows expired only after the trial window ends", () => {
    const result = getTrialBannerVisibility({
      trialActivatedAt: activatedAt,
      plan: "free",
      planExpiresAt: "",
      nowMs: Date.parse(activatedAt) + TRIAL_DURATION_MS + 60_000,
    });
    expect(result.show).toBe(true);
    expect(result.variant).toBe("expired");
  });

  it("formats remaining time as calendar days and hours within the day", () => {
    const trialEnd = Date.parse(activatedAt) + TRIAL_DURATION_MS;
    const result = getTrialBannerVisibility({
      trialActivatedAt: activatedAt,
      plan: "pro",
      planExpiresAt: new Date(trialEnd).toISOString(),
      nowMs: Date.parse(activatedAt) + 3 * 60 * 60 * 1000,
    });
    expect(result).toMatchObject({ show: true, variant: "active", days: 6, hours: 21 });
  });
});
