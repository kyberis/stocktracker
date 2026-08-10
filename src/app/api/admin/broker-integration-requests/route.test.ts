import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  listBrokerIntegrationRequestsForAdmin: vi.fn(),
  listBrokerIntegrationRequestGroupsForAdmin: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireAdmin } from "@/lib/auth/guards";
import {
  listBrokerIntegrationRequestsForAdmin,
  listBrokerIntegrationRequestGroupsForAdmin,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedListFlat = vi.mocked(listBrokerIntegrationRequestsForAdmin);
const mockedListGroups = vi.mocked(listBrokerIntegrationRequestGroupsForAdmin);

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAdmin.mockResolvedValue({ session: { userId: "admin-1", role: "admin" }, error: null } as never);
  mockedListFlat.mockResolvedValue({ entries: [], total: 0 });
  mockedListGroups.mockResolvedValue({ entries: [], total: 0 });
});

describe("GET /api/admin/broker-integration-requests", () => {
  it("returns the flat list by default", async () => {
    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/admin/broker-integration-requests"),
    );
    expect(res.status).toBe(200);
    expect(mockedListFlat).toHaveBeenCalledWith(0, 25);
    expect(mockedListGroups).not.toHaveBeenCalled();
  });

  it("returns the grouped view when ?view=grouped is set", async () => {
    mockedListGroups.mockResolvedValue({
      entries: [
        {
          normalizedName: "trade republic",
          displayName: "Trade Republic",
          variants: ["Trade Republic", "TRADE REPUBLIC"],
          count: 2,
          statusCounts: { requested: 2, reviewing: 0, planned: 0, done: 0, rejected: 0 },
          earliestRequestedAt: "2026-01-01",
          latestRequestedAt: "2026-02-01",
        },
      ],
      total: 1,
    });

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/admin/broker-integration-requests?view=grouped&page=0&pageSize=10"),
    );

    expect(res.status).toBe(200);
    expect(mockedListGroups).toHaveBeenCalledWith(0, 10);
    expect(mockedListFlat).not.toHaveBeenCalled();
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.entries[0].normalizedName).toBe("trade republic");
  });

  it("requires admin auth for both views", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireAdmin.mockResolvedValue({ session: null, error: errorRes } as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/admin/broker-integration-requests?view=grouped"),
    );

    expect(res.status).toBe(401);
    expect(mockedListGroups).not.toHaveBeenCalled();
    expect(mockedListFlat).not.toHaveBeenCalled();
  });
});
