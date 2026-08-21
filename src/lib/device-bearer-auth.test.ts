import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  findUserByWidgetToken: vi.fn(),
  findUserByDevicePasskey: vi.fn(),
  markDeviceLinked: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "203.0.113.10"),
  checkDeviceAuthRateLimit: vi.fn(),
}));

import { findUserByWidgetToken, findUserByDevicePasskey, markDeviceLinked } from "@/lib/db";
import { checkDeviceAuthRateLimit } from "@/lib/rate-limit";
import {
  authenticateDeviceBearer,
  deviceBearerRateLimitResponse,
} from "@/lib/device-bearer-auth";

const mockedFindWidget = vi.mocked(findUserByWidgetToken);
const mockedFindPasskey = vi.mocked(findUserByDevicePasskey);
const mockedMarkLinked = vi.mocked(markDeviceLinked);
const mockedRateLimit = vi.mocked(checkDeviceAuthRateLimit);

function reqWithBearer(token?: string) {
  const headers = new Headers();
  if (token !== undefined) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest("https://trefolio.com/api/portfolio/summary", { headers });
}

describe("authenticateDeviceBearer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 100,
      limit: 180,
      resetAt: new Date(Date.now() + 900_000).toISOString(),
    });
  });

  it("returns missing_bearer without Authorization", async () => {
    const result = await authenticateDeviceBearer(reqWithBearer());
    expect(result).toEqual({ status: "missing_bearer" });
    expect(mockedRateLimit).not.toHaveBeenCalled();
  });

  it("returns rate_limited without looking up the token", async () => {
    mockedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 180,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const result = await authenticateDeviceBearer(reqWithBearer("tfw_abc"));
    expect(result.status).toBe("rate_limited");
    if (result.status === "rate_limited") {
      expect(result.retryAfterSec).toBeGreaterThan(0);
      expect(result.retryAfterSec).toBeLessThanOrEqual(60);
    }
    expect(mockedFindWidget).not.toHaveBeenCalled();
  });

  it("accepts widget tokens and trims whitespace", async () => {
    mockedFindWidget.mockResolvedValue({ id: "u1" } as never);
    const result = await authenticateDeviceBearer(reqWithBearer("  tfw_abc  "));
    expect(result).toEqual({
      status: "ok",
      user: { id: "u1" },
      method: "widget_token",
    });
    expect(mockedFindWidget).toHaveBeenCalledWith("tfw_abc");
  });

  it("falls back to device passkey and marks linked", async () => {
    mockedFindWidget.mockResolvedValue(null);
    mockedFindPasskey.mockResolvedValue({ id: "u2" } as never);
    const result = await authenticateDeviceBearer(reqWithBearer("1234-5678-9012"));
    expect(result).toEqual({
      status: "ok",
      user: { id: "u2" },
      method: "device_passkey",
    });
    expect(mockedMarkLinked).toHaveBeenCalledWith("u2");
  });

  it("returns invalid_token when neither matches", async () => {
    mockedFindWidget.mockResolvedValue(null);
    mockedFindPasskey.mockResolvedValue(null);
    const result = await authenticateDeviceBearer(reqWithBearer("tfw_nope"));
    expect(result).toEqual({ status: "invalid_token" });
  });
});

describe("deviceBearerRateLimitResponse", () => {
  it("returns 429 with Retry-After and reason", async () => {
    const res = deviceBearerRateLimitResponse(42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    await expect(res.json()).resolves.toEqual({
      error: "Too many requests. Try again shortly.",
      reason: "rate_limited",
    });
  });
});
