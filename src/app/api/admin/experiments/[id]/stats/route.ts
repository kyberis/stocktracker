import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, err } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { getExperimentStats } from "@/lib/db";

export const GET = withMetrics(
  "/api/admin/experiments/[id]/stats",
  async (req: NextRequest, ctx?: unknown) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const stats = await getExperimentStats(id);
    if (!stats) return err("Not found", 404);
    return ok({ stats });
  },
);
