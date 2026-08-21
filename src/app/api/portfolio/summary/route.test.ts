import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/device-bearer-auth", () => ({
  authenticateDeviceBearer: vi.fn(),
  deviceBearerRateLimitResponse: vi.fn((retryAfterSec = 900) =>
    Response.json(
      { error: "Too many requests. Try again shortly.", reason: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    ),
  ),
}));

vi.mock("@/lib/log-unauthorized", () => ({
  json401: vi.fn((req: NextRequest) =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
  ),
}));

vi.mock("@/lib/metrics", () => ({
  deviceApiCalls: { inc: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  listHoldings: vi.fn().mockResolvedValue([]),
  listCashEntries: vi.fn().mockResolvedValue([]),
  findPortfolioById: vi.fn(),
}));

import { getSessionFromRequest } from "@/lib/auth/session";
import { authenticateDeviceBearer } from "@/lib/device-bearer-auth";
import { json401 } from "@/lib/log-unauthorized";
import { GET } from "@/app/api/portfolio/summary/route";

const mockedSession = vi.mocked(getSessionFromRequest);
const mockedBearer = vi.mocked(authenticateDeviceBearer);
const mockedJson401 = vi.mocked(json401);

describe("GET /api/portfolio/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue(null);
  });

  it("returns 429 when device bearer auth is rate limited (not 401)", async () => {
    mockedBearer.mockResolvedValue({ status: "rate_limited", retryAfterSec: 120 });
    const req = new NextRequest("https://trefolio.com/api/portfolio/summary?full=true", {
      headers: { authorization: "Bearer tfw_test" },
    });
    const res = await GET(req);
    expect(res.status).toBe(429);
    expect(mockedJson401).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.reason).toBe("rate_limited");
  });

  it("returns 401 for invalid widget tokens", async () => {
    mockedBearer.mockResolvedValue({ status: "invalid_token" });
    mockedJson401.mockReturnValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
    );
    const req = new NextRequest("https://trefolio.com/api/portfolio/summary", {
      headers: { authorization: "Bearer tfw_bad" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockedJson401).toHaveBeenCalled();
  });

  it("returns empty summary for a valid widget token with no holdings", async () => {
    mockedBearer.mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    const { findUserById } = await import("@/lib/db");
    vi.mocked(findUserById).mockResolvedValue({
      id: "u1",
      device_portfolio_id: "",
    } as never);

    const req = new NextRequest("https://trefolio.com/api/portfolio/summary?full=true", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topHoldings).toEqual([]);
    expect(body.holdingsCount).toBe(0);
  });
});
