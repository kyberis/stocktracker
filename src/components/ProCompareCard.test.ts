/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ plan: "free" as string }));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { plan: authState.plan } }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/use-track", () => ({
  useTrack: () => vi.fn(),
}));

vi.mock("@/lib/ad-tracking", () => ({
  trackCanonicalConversion: vi.fn(),
}));

vi.mock("@/lib/commerce", () => ({
  useCommerceEnabled: vi.fn(),
}));

vi.mock("@/components/TierIcon", () => ({
  default: () => null,
}));

vi.mock("@/components/QuotaCompareTable", () => ({
  default: () => null,
}));

import ProCompareCard from "@/components/ProCompareCard";
import { useCommerceEnabled } from "@/lib/commerce";

const mockedUseCommerceEnabled = vi.mocked(useCommerceEnabled);

describe("ProCompareCard", () => {
  afterEach(() => {
    authState.plan = "free";
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when commerce is disabled", () => {
    mockedUseCommerceEnabled.mockReturnValue(false);
    const { container } = render(
      React.createElement(ProCompareCard, {
        surface: "profile_always_on",
        reason: "upgrade_required",
      }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows Basic, Pro, and Wealth subscribe buttons for a free user", () => {
    authState.plan = "free";
    mockedUseCommerceEnabled.mockReturnValue(true);
    const { getByTestId, getAllByRole, queryByTestId } = render(
      React.createElement(ProCompareCard, {
        surface: "profile_always_on",
        reason: "upgrade_required",
      }),
    );
    expect(getByTestId("pro-compare-card")).toBeTruthy();
    expect(getAllByRole("button", { name: /Basic/i }).length).toBeGreaterThan(0);
    expect(getAllByRole("button", { name: /Pro/i }).length).toBeGreaterThan(0);
    expect(getAllByRole("button", { name: /Wealth/i }).length).toBeGreaterThan(0);
    expect(queryByTestId("billing-proration-note")).toBeNull();
  });

  it("explains invoice credit when a Basic subscriber can upgrade", () => {
    authState.plan = "basic";
    mockedUseCommerceEnabled.mockReturnValue(true);
    const { getByTestId, queryByRole, getAllByRole } = render(
      React.createElement(ProCompareCard, {
        surface: "profile_always_on",
        reason: "upgrade_required",
      }),
    );
    expect(getByTestId("billing-proration-note").textContent).toBe("billingUpgradeProrationNote");
    expect(queryByRole("button", { name: /Basic/i })).toBeNull();
    expect(getAllByRole("button", { name: /Pro/i }).length).toBeGreaterThan(0);
    expect(getAllByRole("button", { name: /Wealth/i }).length).toBeGreaterThan(0);
  });
});
