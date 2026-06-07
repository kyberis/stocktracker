import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/commerce-server", () => ({
  isCommerceEnabled: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  updateUserSubscription: vi.fn(),
  computeMembershipGrantExpiry: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/idp/entitlements", () => ({
  linkLocalUserToIdpSub: vi.fn(),
}));

import { isCommerceEnabled } from "@/lib/commerce-server";
import { findUserById, updateUserSubscription, computeMembershipGrantExpiry } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import {
  COMMERCE_COMPLIMENTARY_DAYS,
  grantCommerceComplimentaryPro,
  isCommerceComplimentaryActive,
  isCommerceComplimentaryCandidate,
  renewCommerceComplimentaryPro,
} from "./commerce-complimentary-pro";

const mockedCommerce = vi.mocked(isCommerceEnabled);
const mockedFindUser = vi.mocked(findUserById);
const mockedUpdateSub = vi.mocked(updateUserSubscription);
const mockedComputeExpiry = vi.mocked(computeMembershipGrantExpiry);
const mockedEnsureInit = vi.mocked(ensureInitialized);

const mockClient = {
  execute: vi.fn().mockResolvedValue({ rows: [] }),
};

const baseUser = {
  id: "u1",
  email: "user@test.com",
  plan: "free" as const,
  plan_expires_at: "",
  stripe_subscription_id: "",
  commerce_complimentary_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
  mockedCommerce.mockResolvedValue(false);
  mockedComputeExpiry.mockImplementation((_user, _plan, days) => {
    return new Date(Date.now() + days * 86400000);
  });
});

describe("isCommerceComplimentaryCandidate", () => {
  it("returns false without marker", () => {
    expect(isCommerceComplimentaryCandidate(baseUser)).toBe(false);
  });

  it("returns false with Stripe subscription", () => {
    expect(
      isCommerceComplimentaryCandidate({
        ...baseUser,
        commerce_complimentary_at: "2026-01-01",
        stripe_subscription_id: "sub_123",
      }),
    ).toBe(false);
  });

  it("returns true with marker and no Stripe", () => {
    expect(
      isCommerceComplimentaryCandidate({
        ...baseUser,
        commerce_complimentary_at: "2026-01-01",
      }),
    ).toBe(true);
  });
});

describe("isCommerceComplimentaryActive", () => {
  it("returns true when complimentary pro is still valid", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      isCommerceComplimentaryActive({
        ...baseUser,
        commerce_complimentary_at: "2026-01-01",
        plan: "pro",
        plan_expires_at: future,
      }),
    ).toBe(true);
  });

  it("returns false when complimentary period expired", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      isCommerceComplimentaryActive({
        ...baseUser,
        commerce_complimentary_at: "2026-01-01",
        plan: "pro",
        plan_expires_at: past,
      }),
    ).toBe(false);
  });
});

describe("grantCommerceComplimentaryPro", () => {
  it("skips when commerce is enabled", async () => {
    mockedCommerce.mockResolvedValue(true);
    const result = await grantCommerceComplimentaryPro("u1");
    expect(result).toEqual({ granted: false, reason: "commerce_enabled" });
    expect(mockedFindUser).not.toHaveBeenCalled();
  });

  it("grants 30-day pro for new free user", async () => {
    mockedFindUser.mockResolvedValue(baseUser as never);
    const result = await grantCommerceComplimentaryPro("u1");
    expect(result.granted).toBe(true);
    expect(mockedComputeExpiry).toHaveBeenCalledWith(baseUser, "pro", COMMERCE_COMPLIMENTARY_DAYS);
    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", {
      plan: "pro",
      planExpiresAt: expect.any(String),
    });
    expect(mockClient.execute).toHaveBeenCalled();
  });

  it("skips Stripe-managed users", async () => {
    mockedFindUser.mockResolvedValue({
      ...baseUser,
      stripe_subscription_id: "sub_abc",
    } as never);
    const result = await grantCommerceComplimentaryPro("u1");
    expect(result).toEqual({ granted: false, reason: "stripe_managed" });
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });
});

describe("renewCommerceComplimentaryPro", () => {
  it("skips when commerce is enabled", async () => {
    mockedCommerce.mockResolvedValue(true);
    const result = await renewCommerceComplimentaryPro("u1");
    expect(result).toEqual({ renewed: false, reason: "commerce_enabled" });
  });

  it("skips when period is still active", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    mockedFindUser.mockResolvedValue({
      ...baseUser,
      commerce_complimentary_at: "2026-01-01",
      plan: "pro",
      plan_expires_at: future,
    } as never);
    const result = await renewCommerceComplimentaryPro("u1");
    expect(result).toEqual({ renewed: false, reason: "not_expired" });
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });

  it("renews expired complimentary users", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    mockedFindUser.mockResolvedValue({
      ...baseUser,
      commerce_complimentary_at: "2026-01-01",
      plan: "pro",
      plan_expires_at: past,
    } as never);
    const result = await renewCommerceComplimentaryPro("u1");
    expect(result.renewed).toBe(true);
    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", {
      plan: "pro",
      planExpiresAt: expect.any(String),
    });
  });

  it("skips users without complimentary marker", async () => {
    mockedFindUser.mockResolvedValue(baseUser as never);
    const result = await renewCommerceComplimentaryPro("u1");
    expect(result).toEqual({ renewed: false, reason: "not_candidate" });
  });
});
