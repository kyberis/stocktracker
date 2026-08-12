import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, err, parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { setExperimentStatus, type ExperimentStatus } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["draft", "running", "paused", "archived"]),
});

export const POST = withMetrics(
  "/api/admin/experiments/[id]/status",
  async (req: NextRequest, ctx?: unknown) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const parsed = await parseBody(req, schema);
    if (!parsed.success) return parsed.error;

    try {
      const experiment = await setExperimentStatus(
        id,
        parsed.data.status as ExperimentStatus,
      );
      return ok({ experiment });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update status";
      return err(message, message.includes("not found") ? 404 : 400);
    }
  },
);
