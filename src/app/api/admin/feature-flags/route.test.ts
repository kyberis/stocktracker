import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn(),
    setFeatureEnabled: vi.fn(),
    getFeatureFlagOverrideCounts: vi.fn(),
  };
});

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_path: string, handler: unknown) => handler,
}));

import { requireAdmin } from "@/lib/auth/guards";
import { ALL_PLATFORM_FEATURES, isFeatureEnabled, setFeatureEnabled } from "@/lib/db";
import { GET, PUT } from "./route";

describe("/api/admin/feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      session: { userId: "admin-1", role: "admin" },
      error: null,
    } as never);
  });

  it("GET returns every registered flag including portfolio_anomaly_agent and display_invariants", async () => {
    const { getFeatureFlagOverrideCounts } = await import("@/lib/db");
    vi.mocked(getFeatureFlagOverrideCounts).mockResolvedValue({});
    vi.mocked(isFeatureEnabled).mockImplementation(async (flag) =>
      flag === "portfolio_anomaly_agent" || flag === "display_invariants",
    );

    const res = await GET(new NextRequest("http://localhost/api/admin/feature-flags"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body.flags).sort()).toEqual([...ALL_PLATFORM_FEATURES].sort());
    expect(body.flags.portfolio_anomaly_agent).toBe(true);
    expect(body.flags.display_invariants).toBe(true);
  });

  it("PUT persists portfolio_anomaly_agent", async () => {
    vi.mocked(setFeatureEnabled).mockResolvedValue(undefined);

    const res = await PUT(
      new NextRequest("http://localhost/api/admin/feature-flags", {
        method: "PUT",
        body: JSON.stringify({ flag: "portfolio_anomaly_agent", enabled: true }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    expect(setFeatureEnabled).toHaveBeenCalledWith("portfolio_anomaly_agent", true);
  });
});
