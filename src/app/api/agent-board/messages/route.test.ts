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
  listAgentBoardMessagesForComposer: vi.fn(),
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

import { getSessionFromRequest } from "@/lib/auth/session";
import { authenticateDeviceBearer } from "@/lib/device-bearer-auth";
import {
  isFeatureEnabledForUser,
  listAgentBoardMessages,
  listAgentBoardMessagesForComposer,
  getUserSettings,
  updateUserSettings,
} from "@/lib/db";
import { GET } from "@/app/api/agent-board/messages/route";

describe("GET /api/agent-board/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(updateUserSettings).mockResolvedValue(undefined as never);
    vi.mocked(listAgentBoardMessagesForComposer).mockResolvedValue([]);
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

  it("auto-enables the board and returns active messages for a widget token", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ agentBoardEnabled: false } as never);
    vi.mocked(listAgentBoardMessages).mockResolvedValue([
      {
        id: "m1",
        userId: "u1",
        agent: "warren",
        kind: "news",
        contextKey: "news:AAPL",
        body: "AAPL jumped 4% on earnings.",
        priority: 1,
        createdAt: "2026-08-28T12:00:00.000Z",
        expiresAt: null,
      },
    ]);

    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(updateUserSettings).toHaveBeenCalledWith("u1", { agentBoardEnabled: true });
    const body = await res.json();
    expect(body).toMatchObject({
      enabled: true,
      status: "ok",
      messages: [{ id: "m1", agent: "warren", body: "AAPL jumped 4% on earnings." }],
    });
  });

  it("falls back to the last message when nothing is active", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ agentBoardEnabled: true } as never);
    vi.mocked(listAgentBoardMessages).mockResolvedValue([]);
    vi.mocked(listAgentBoardMessagesForComposer).mockResolvedValue([
      {
        id: "old",
        userId: "u1",
        agent: "warren",
        kind: "mover",
        contextKey: "mover:NVDA",
        body: "NVDA moved earlier.",
        priority: 2,
        createdAt: "2026-08-27T12:00:00.000Z",
        expiresAt: "2026-08-28T00:00:00.000Z",
      },
    ]);

    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    const body = await res.json();
    expect(body).toMatchObject({
      enabled: true,
      status: "stale",
      messages: [{ id: "old", body: "NVDA moved earlier." }],
    });
  });

  it("returns nothing_new when there is no history", async () => {
    vi.mocked(authenticateDeviceBearer).mockResolvedValue({
      status: "ok",
      user: { id: "u1" } as never,
      method: "widget_token",
    });
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(getUserSettings).mockResolvedValue({ agentBoardEnabled: true } as never);
    vi.mocked(listAgentBoardMessages).mockResolvedValue([]);
    vi.mocked(listAgentBoardMessagesForComposer).mockResolvedValue([]);

    const req = new NextRequest("https://trefolio.com/api/agent-board/messages", {
      headers: { authorization: "Bearer tfw_ok" },
    });
    const res = await GET(req);
    await expect(res.json()).resolves.toEqual({
      enabled: true,
      status: "nothing_new",
      messages: [],
    });
  });
});
