import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, err } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { resetExperimentAssignments } from "@/lib/db";

export const POST = withMetrics(
  "/api/admin/experiments/[id]/reset",
  async (req: NextRequest, ctx?: unknown) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    try {
      const experiment = await resetExperimentAssignments(id);
      return ok({ experiment });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to reset";
      return err(message, message.includes("not found") ? 404 : 400);
    }
  },
);
