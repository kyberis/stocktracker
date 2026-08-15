import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockGet, mockSet, mockIsFeature, mockSetFeature } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockIsFeature: vi.fn(),
  mockSetFeature: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPlatformSetting: mockGet,
  setPlatformSetting: mockSet,
  isFeatureEnabled: mockIsFeature,
  setFeatureEnabled: mockSetFeature,
}));

import { isEmailNodeEnabled, setEmailNodeEnabled } from "./toggles";

describe("email node toggles", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockIsFeature.mockReset();
    mockSetFeature.mockReset();
  });

  it("uses the feature flag when the node is flag-gated", async () => {
    mockIsFeature.mockResolvedValue(false);
    await expect(isEmailNodeEnabled("welcome-no-stocks")).resolves.toBe(false);
    expect(mockIsFeature).toHaveBeenCalledWith("lifecycle_activation_email_enabled");
  });

  it("defaults on for emails without a stored toggle", async () => {
    mockGet.mockResolvedValue("");
    await expect(isEmailNodeEnabled("verify")).resolves.toBe(true);
  });

  it("reads JSON toggles for emails without a feature flag", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ verify: false }));
    await expect(isEmailNodeEnabled("verify")).resolves.toBe(false);
  });

  it("writes the feature flag when toggling a gated email", async () => {
    await setEmailNodeEnabled("digest-email", true);
    expect(mockSetFeature).toHaveBeenCalledWith("weekly_digest_enabled", true);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("writes JSON when toggling an email without a feature flag", async () => {
    mockGet.mockResolvedValue("{}");
    await setEmailNodeEnabled("verify", false);
    expect(mockSet).toHaveBeenCalledWith(
      "email_node_toggles",
      JSON.stringify({ verify: false }),
    );
  });
});
