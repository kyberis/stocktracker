import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listScreeningAnalyzeAdmin } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

/**
 * GET /api/admin/screening-analyze — Analyze runs (newest first) with
 * requesting users and IR resource usage. Ops-only.
 */
export const GET = withMetrics(
  "/api/admin/screening-analyze",
  async (req: NextRequest) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;
    const userId = url.searchParams.get("userId") || undefined;

    const data = await listScreeningAnalyzeAdmin({ limit, offset, userId });
    return NextResponse.json({
      users: data.users,
      runs: data.runs.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.username,
        email: r.email,
        status: r.status,
        ticker: r.ticker,
        companyName: r.companyName,
        exchange: r.exchange,
        mockedPipeline: r.mockedPipeline,
        costUsd: r.costUsd,
        breakdown: r.costBreakdown,
        irProvider: r.irProvider,
        serperQueries: r.serperQueries,
        jinaUrls: r.jinaUrls,
        irSiteDocsUsed: r.irSiteDocsUsed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total: data.total,
      uniqueUsers: data.uniqueUsers,
      totalCostUsd: data.totalCostUsd,
    });
  },
);
