import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  listScreeningAnalyzeAdmin: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_path: string, handler: unknown) => handler,
}));

import { requireAdmin } from "@/lib/auth/guards";
import { listScreeningAnalyzeAdmin } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/admin/screening-analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      session: null,
      error: new Response("Forbidden", { status: 403 }),
    } as never);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/screening-analyze"),
    );
    expect(res.status).toBe(403);
    expect(listScreeningAnalyzeAdmin).not.toHaveBeenCalled();
  });

  it("returns Analyze users and resource usage", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      session: { userId: "admin-1", role: "admin" },
      error: null,
    } as never);
    vi.mocked(listScreeningAnalyzeAdmin).mockResolvedValue({
      users: [
        {
          userId: "u1",
          username: "alice",
          email: "a@example.com",
          analyzeCount: 2,
          lastRequestedAt: "2026-08-14T00:00:00.000Z",
        },
      ],
      runs: [
        {
          id: "run-1",
          userId: "u1",
          username: "alice",
          email: "a@example.com",
          status: "completed",
          intent: "analyze",
          briefJson: "{}",
          mockedPipeline: false,
          costUsd: 0.05,
          costJson: "",
          costBreakdown: {
            currency: "USD",
            llmUsd: 0.04,
            tavilySearchUsd: 0.01,
            tavilyExtractUsd: 0,
            tavilyResearchUsd: 0,
            tavilySearchCredits: 2,
            tavilyExtractCredits: 0,
            tavilyResearchCredits: 0,
            llmTokensIn: 800,
            llmTokensOut: 200,
          },
          createdAt: "2026-08-14T00:00:00.000Z",
          updatedAt: "2026-08-14T00:01:00.000Z",
          ticker: "UBER",
          companyName: "Uber Technologies, Inc.",
          exchange: "NYQ",
          irProvider: "serper_jina",
          serperQueries: 2,
          jinaUrls: 3,
          irSiteDocsUsed: true,
        },
      ],
      total: 1,
      uniqueUsers: 1,
      totalCostUsd: 0.05,
    });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/screening-analyze?limit=20"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uniqueUsers).toBe(1);
    expect(body.users[0].email).toBe("a@example.com");
    expect(body.runs[0].ticker).toBe("UBER");
    expect(body.runs[0].irProvider).toBe("serper_jina");
    expect(body.runs[0].serperQueries).toBe(2);
    expect(listScreeningAnalyzeAdmin).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      userId: undefined,
    });
  });
});
