import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listScreeningRunsByCostAdmin } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

/**
 * GET /api/admin/screening-costs — screening reports ranked by variable ops cost
 * (highest first). Ops-only; not user billing.
 */
export const GET = withMetrics(
  "/api/admin/screening-costs",
  async (req: NextRequest) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;
    const userId = url.searchParams.get("userId") || undefined;

    const data = await listScreeningRunsByCostAdmin({ limit, offset, userId });
    return NextResponse.json({
      runs: data.runs.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.username,
        email: r.email,
        status: r.status,
        intent: r.intent,
        mockedPipeline: r.mockedPipeline,
        costUsd: r.costUsd,
        breakdown: r.costBreakdown,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total: data.total,
      totalCostUsd: data.totalCostUsd,
    });
  },
);
