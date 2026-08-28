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
  json401: vi.fn(() => Response.json({ error: "Unauthorized" }, { status: 401 })),
}));

vi.mock("@/lib/db", () => ({
  isFeatureEnabledForUser: vi.fn(),
  listAgentBoardMessages: vi.fn(),
  getUserSettings: vi.fn(),
}));

import { getSessionFromRequest } from "@/lib/auth/session";
import { authenticateDeviceBearer } from "@/lib/device-bearer-auth";
import { isFeatureEnabledForUser, listAgentBoardMessages, getUserSettings } from "@/lib/db";
import { GET } from "@/app/api/agent-board/messages/route";

describe("GET /api/agent-board/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
  });

  it("returns 429 when widget bearer auth is rate limited", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "rate_limited",
      retryAfterSec: 60,
    });
    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_test" },
    });
    const res = await GET(req);
    expect(res.status).toBe(429);
  });

  it("returns 401 without session or widget token", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({ status: "missing_bearer" });
    const res = await GET(new NextRequest("https://trefolio.com/api/agent-board/messages"));
    expect(res.status).toBe(401);
  });

  it("returns messages for a valid widget token when the board is on", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ agentBoardEnabled: true } as never);
    vi.mocked(listAgentBoardMessages).mockResolvedValue([
      {
        id: "m1",
        userId: "u1",
        agent: "warren",
        kind: "news",
        contextKey: "news:AAPL",
        body: "AAPL jumped 4% on earnings.",
        chipLabel: "Ask Warren",
        chipPrompt: "What happened to AAPL?",
        priority: 1,
        readAt: null,
        dismissedAt: null,
        createdAt: "2026-08-28T12:00:00.000Z",
        expiresAt: null,
      },
    ]);

    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      enabled: true,
      messages: [{ id: "m1", agent: "warren", body: "AAPL jumped 4% on earnings." }],
    });
  });

  it("returns enabled false when the user has not opted in", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ agentBoardEnabled: false } as never);

    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ enabled: false, messages: [] });
  });
});
