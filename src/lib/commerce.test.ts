import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from "@/lib/db";
import { COMMERCE_FLAG, isCommerceEnabled } from "@/lib/commerce-server";

const mockedIsFeatureEnabled = vi.mocked(isFeatureEnabled);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isCommerceEnabled", () => {
  it("delegates to isFeatureEnabled with commerce_enabled", async () => {
    mockedIsFeatureEnabled.mockResolvedValue(true);
    await expect(isCommerceEnabled()).resolves.toBe(true);
    expect(mockedIsFeatureEnabled).toHaveBeenCalledWith(COMMERCE_FLAG);
  });

  it("returns false when the platform flag is off", async () => {
    mockedIsFeatureEnabled.mockResolvedValue(false);
    await expect(isCommerceEnabled()).resolves.toBe(false);
  });
});
