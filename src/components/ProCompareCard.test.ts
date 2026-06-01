/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { plan: "free" } }),
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

import ProCompareCard from "@/components/ProCompareCard";
import { useCommerceEnabled } from "@/lib/commerce";

const mockedUseCommerceEnabled = vi.mocked(useCommerceEnabled);

describe("ProCompareCard", () => {
  afterEach(() => {
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
});
