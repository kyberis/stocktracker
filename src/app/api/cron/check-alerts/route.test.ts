import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/db", () => ({
  listActiveAlertsForCron: vi.fn(),
  claimAlertForOneShotDispatch: vi.fn(),
  claimPortfolioWideTickerNotify: vi.fn(),
  getUserHoldingsForAlerts: vi.fn(),
  insertAlertDispatchLog: vi.fn(),
  trackEvent: vi.fn(),
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/lib/alert-context", () => ({
  getAlertNewsContext: vi.fn().mockResolvedValue({ headlines: [] }),
}));

vi.mock("@/lib/alert-dispatcher", () => ({
  dispatchAlert: vi.fn(),
  normalizeAlertChannels: vi.fn((c: string) => [c]),
}));

vi.mock("@/lib/agent-board/run-cron", () => ({
  executeAgentBoardCron: vi.fn().mockResolvedValue({ disabled: true }),
}));

vi.mock("@/lib/cron-quotes", () => ({
  fetchSharedQuotesAndRates: vi.fn(),
  shouldFetchLiveMarketData: vi.fn(),
}));

import { isFeatureEnabled, listActiveAlertsForCron } from "@/lib/db";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";

describe("GET /api/cron/check-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/cron/check-alerts"));
    expect(res.status).toBe(401);
  });

  it("skips Yahoo when no relevant market is open", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(listActiveAlertsForCron).mockResolvedValue([
      {
        id: "a1",
        ticker: "AAPL",
        name: "Apple",
        condition: "above",
        threshold: 200,
        currency: "USD",
        active: true,
        triggered: false,
        triggeredAt: "",
        createdAt: "",
        alertType: "threshold",
        percentBasis: "daily",
        percentValue: 0,
        isPortfolioWide: false,
        portfolioId: "",
        userId: "u1",
        email: "u@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["email"],
        telegramChatId: "",
        alertDeviceEnabled: false,
        lastNotifiedTicker: "",
        lastNotifiedAt: "",
        language: "en",
      },
    ]);
    vi.mocked(shouldFetchLiveMarketData).mockReturnValue(false);

    const { GET } = await import("./route");
    const res = await GET(
      new NextRequest("http://localhost/api/cron/check-alerts", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      checked: 1,
      triggered: 0,
      skippedMarketsClosed: true,
    });
    expect(fetchSharedQuotesAndRates).not.toHaveBeenCalled();
  });
});
