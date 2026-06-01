import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/commerce-server", () => ({
  isCommerceEnabled: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  trackEvent: vi.fn(),
  updateUserSubscription: vi.fn(),
  countProSubscribers: vi.fn(),
  isFeatureEnabledForUser: vi.fn(),
  getStripePriceConfig: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getBillingBaseUrl: vi.fn(),
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  billingEventsTotal: { inc: vi.fn() },
}));

vi.mock("@/lib/auth/login-probe-log", () => ({
  authProbeLog: vi.fn(),
  authProbeWarn: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireSession } from "@/lib/auth/guards";
import { isCommerceEnabled } from "@/lib/commerce-server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedIsCommerceEnabled = vi.mocked(isCommerceEnabled);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/billing/device-checkout", () => {
  it("returns 403 when commerce is disabled", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedIsCommerceEnabled.mockResolvedValue(false);

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/billing/device-checkout", { method: "POST" });
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not available/i);
  });
});
