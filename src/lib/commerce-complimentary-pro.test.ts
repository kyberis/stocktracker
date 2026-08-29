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
  it("is retired during local Pro sunset", async () => {
    const result = await grantCommerceComplimentaryPro("u1");
    expect(result).toEqual({ granted: false, reason: "local_pro_sunset" });
    expect(mockedFindUser).not.toHaveBeenCalled();
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });
});

describe("renewCommerceComplimentaryPro", () => {
  it("is retired during local Pro sunset", async () => {
    const result = await renewCommerceComplimentaryPro("u1");
    expect(result).toEqual({ renewed: false, reason: "local_pro_sunset" });
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });
});
