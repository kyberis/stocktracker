import { describe, expect, it } from "vitest";
import {
  getManualRefreshAvailability,
  MANUAL_RECOMMENDATION_COOLDOWN_MS,
} from "./portfolio-recommendations";

describe("getManualRefreshAvailability", () => {
  it("allows refresh when never run manually", () => {
    expect(getManualRefreshAvailability("").canManualRefresh).toBe(true);
    expect(getManualRefreshAvailability(null).canManualRefresh).toBe(true);
  });

  it("blocks within 7 days of last manual run", () => {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const avail = getManualRefreshAvailability(recent);
    expect(avail.canManualRefresh).toBe(false);
    expect(avail.cooldownRemainingMs).toBeGreaterThan(0);
    expect(avail.cooldownRemainingMs).toBeLessThanOrEqual(MANUAL_RECOMMENDATION_COOLDOWN_MS);
    expect(avail.nextManualRefreshAt).toBeTruthy();
  });

  it("allows after 7 days", () => {
    const old = new Date(Date.now() - MANUAL_RECOMMENDATION_COOLDOWN_MS - 1000).toISOString();
    expect(getManualRefreshAvailability(old).canManualRefresh).toBe(true);
  });
});
