export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { ok } from "@/lib/api-response";
import { requireScreeningDevAccess } from "@/lib/screening/guard";
import { listScreeningAgentOutputsByUser } from "@/lib/db";

/**
 * GET /api/screening/dev/outputs?limit=20
 *
 * Temporary Dev endpoint: returns the last N screening agent outputs for the
 * signed-in user (Intake only in this slice). Gated by admin role, dev env, or
 * the `screening_dev_lab_enabled` flag so it is not discoverable pre-launch.
 */
export const GET = withMetrics(
  "/api/screening/dev/outputs",
  async (req: NextRequest) => {
    const { session, error } = await requireScreeningDevAccess(req);
    if (error || !session) return error;

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;

    const rows = await listScreeningAgentOutputsByUser(session.userId, limit);
    return ok({
      outputs: rows.map((r) => ({
        id: r.id,
        runId: r.runId,
        agentKind: r.agentKind,
        latencyMs: r.latencyMs,
        createdAt: r.createdAt,
        outputJson: r.outputJson,
      })),
    });
  },
);
