import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  listScreeningRunsByCostAdmin: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_path: string, handler: unknown) => handler,
}));

import { requireAdmin } from "@/lib/auth/guards";
import { listScreeningRunsByCostAdmin } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/admin/screening-costs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      session: null,
      error: new Response("Forbidden", { status: 403 }),
    } as never);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/screening-costs"),
    );
    expect(res.status).toBe(403);
    expect(listScreeningRunsByCostAdmin).not.toHaveBeenCalled();
  });

  it("returns runs ranked by cost", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      session: { userId: "admin-1", role: "admin" },
      error: null,
    } as never);
    vi.mocked(listScreeningRunsByCostAdmin).mockResolvedValue({
      runs: [
        {
          id: "run-expensive",
          userId: "u1",
          username: "alice",
          email: "a@example.com",
          status: "completed",
          intent: "explore",
          briefJson: "{}",
          mockedPipeline: false,
          costUsd: 1.5,
          costJson: "",
          costBreakdown: {
            currency: "USD",
            llmUsd: 1,
            tavilySearchUsd: 0.3,
            tavilyExtractUsd: 0.1,
            tavilyResearchUsd: 0.1,
            tavilySearchCredits: 1,
            tavilyExtractCredits: 1,
            tavilyResearchCredits: 1,
            llmTokensIn: 1000,
            llmTokensOut: 200,
          },
          createdAt: "2026-08-09T00:00:00.000Z",
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
      ],
      total: 1,
      totalCostUsd: 1.5,
    });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/screening-costs?limit=10"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.totalCostUsd).toBe(1.5);
    expect(body.runs[0].id).toBe("run-expensive");
    expect(body.runs[0].costUsd).toBe(1.5);
    expect(listScreeningRunsByCostAdmin).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      userId: undefined,
    });
  });
});
