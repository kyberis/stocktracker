export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { ok } from "@/lib/api-response";
import { requireScreeningDevAccess } from "@/lib/screening/guard";
import {
  listScreeningAgentOutputsByRun,
  listScreeningAgentOutputsByUser,
} from "@/lib/db";

/**
 * GET /api/screening/dev/outputs?limit=20&runId=<optional>
 *
 * Temporary Dev endpoint: returns screening agent outputs for the signed-in
 * user. When `runId` is set, returns that run's outputs (sources + per-agent
 * results). Gated by admin role, dev env, or `screening_dev_lab_enabled`.
 */
export const GET = withMetrics(
  "/api/screening/dev/outputs",
  async (req: NextRequest) => {
    const { session, error } = await requireScreeningDevAccess(req);
    if (error || !session) return error;

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;
    const runId = req.nextUrl.searchParams.get("runId")?.trim() || null;

    const rows = runId
      ? await listScreeningAgentOutputsByRun(runId, session.userId)
      : await listScreeningAgentOutputsByUser(session.userId, limit);

    const capped = runId ? rows.slice(0, limit) : rows;

    return ok({
      outputs: capped.map((r) => ({
        id: r.id,
        runId: r.runId,
        agentKind: r.agentKind,
        ticker: r.ticker,
        latencyMs: r.latencyMs,
        createdAt: r.createdAt,
        outputJson: r.outputJson,
      })),
    });
  },
);
