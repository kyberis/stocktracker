import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isFeatureEnabledForUser: vi.fn(),
  listHoldings: vi.fn(),
  listCashEntries: vi.fn(),
}));

vi.mock("@/lib/db/aid-user-state", () => ({
  getAidLayoutOrderPartial: vi.fn(),
  setAidLayoutOrder: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser, listCashEntries, listHoldings } from "@/lib/db";
import {
  getAidLayoutOrderPartial,
  setAidLayoutOrder,
} from "@/lib/db/aid-user-state";
import { DEFAULT_AID_LAYOUT_HOLDINGS } from "@/lib/aid/layout-sections";
import { GET, PUT } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedFlag = vi.mocked(isFeatureEnabledForUser);
const mockedHoldings = vi.mocked(listHoldings);
const mockedCash = vi.mocked(listCashEntries);
const mockedGetLayout = vi.mocked(getAidLayoutOrderPartial);
const mockedSetLayout = vi.mocked(setAidLayoutOrder);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: {
      userId: "u1",
      username: "u",
      email: "u@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "free",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
  mockedFlag.mockResolvedValue(true);
  mockedHoldings.mockResolvedValue([{ ticker: "AAPL", shares: 1 }] as never);
  mockedCash.mockResolvedValue([] as never);
  mockedGetLayout.mockResolvedValue({});
});

describe("GET /api/aid/layout", () => {
  it("returns resolved default layout", async () => {
    const res = await GET(new NextRequest("http://localhost/api/aid/layout"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.layout).toEqual(DEFAULT_AID_LAYOUT_HOLDINGS);
  });

  it("returns 403 when flag off", async () => {
    mockedFlag.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/aid/layout"));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/aid/layout", () => {
  it("persists valid layout", async () => {
    const layout = {
      main: ["portfolio", "finpulse", "priority", "briefing", "news", "earnings", "extras", "holdings_lookup", "shortcuts"],
      sidebar: ["warren", "will", "clara"],
    };
    const res = await PUT(
      new NextRequest("http://localhost/api/aid/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockedSetLayout).toHaveBeenCalledWith("u1", layout);
  });

  it("rejects invalid layout", async () => {
    const res = await PUT(
      new NextRequest("http://localhost/api/aid/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main: ["portfolio"], sidebar: ["warren"] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedSetLayout).not.toHaveBeenCalled();
  });
});
