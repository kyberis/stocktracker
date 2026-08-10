import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("./analytics", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockUpdateUserSubscription = vi.fn().mockResolvedValue(undefined);
vi.mock("./users", () => ({
  updateUserSubscription: (...args: unknown[]) => mockUpdateUserSubscription(...args),
}));

const mockIsIdpEnabled = vi.fn().mockReturnValue(true);
vi.mock("@/lib/idp/config", () => ({
  isIdpEnabled: () => mockIsIdpEnabled(),
}));

const mockImportUser = vi.fn().mockResolvedValue({ sub: "idp-sub-referrer" });
vi.mock("@/lib/idp/client", () => ({
  importUser: (...args: unknown[]) => mockImportUser(...args),
}));

const mockLinkLocalUserToIdpSub = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/idp/entitlements", () => ({
  linkLocalUserToIdpSub: (...args: unknown[]) => mockLinkLocalUserToIdpSub(...args),
}));

import { grantReferralReward } from "./referrals";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsIdpEnabled.mockReturnValue(true);
  mockImportUser.mockResolvedValue({ sub: "idp-sub-referrer" });
});

function referrerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "referrer-1",
    email: "referrer@example.com",
    plan: "free",
    plan_expires_at: "",
    stripe_subscription_id: "",
    referral_reward_days: 0,
    ...overrides,
  };
}

describe("grantReferralReward", () => {
  it("grants Pro to a free referrer, updates via updateUserSubscription, and pushes the grant to the IdP", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [referrerRow()] }) // SELECT referrer
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // referral_reward_days increment
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }); // referrals status -> rewarded

    await grantReferralReward("referrer-1", "referral-1");

    expect(mockUpdateUserSubscription).toHaveBeenCalledTimes(1);
    expect(mockUpdateUserSubscription).toHaveBeenCalledWith(
      "referrer-1",
      expect.objectContaining({ plan: "pro" }),
    );
    expect(mockImportUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "referrer@example.com", plan: "pro" }),
    );
    expect(mockLinkLocalUserToIdpSub).toHaveBeenCalledWith({
      localUserId: "referrer-1",
      idpSub: "idp-sub-referrer",
    });
  });

  it("extends an already-gifted-Pro referrer's expiry and still pushes to the IdP", async () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    mockExecute
      .mockResolvedValueOnce({ rows: [referrerRow({ plan: "pro", plan_expires_at: future })] })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    await grantReferralReward("referrer-1", "referral-1");

    expect(mockUpdateUserSubscription).toHaveBeenCalledWith(
      "referrer-1",
      expect.objectContaining({ plan: "pro" }),
    );
    expect(mockImportUser).toHaveBeenCalledTimes(1);
  });

  it("only banks referral_reward_days for a Stripe-paying Pro referrer, without touching plan or the IdP", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [referrerRow({ plan: "pro", stripe_subscription_id: "sub_123" })],
      })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    await grantReferralReward("referrer-1", "referral-1");

    expect(mockUpdateUserSubscription).not.toHaveBeenCalled();
    expect(mockImportUser).not.toHaveBeenCalled();
  });

  it("does not push to the IdP when the IdP is disabled", async () => {
    mockIsIdpEnabled.mockReturnValue(false);
    mockExecute
      .mockResolvedValueOnce({ rows: [referrerRow()] })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    await grantReferralReward("referrer-1", "referral-1");

    expect(mockUpdateUserSubscription).toHaveBeenCalledTimes(1);
    expect(mockImportUser).not.toHaveBeenCalled();
  });
});
