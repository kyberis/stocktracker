import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, err, parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import {
  getExperimentById,
  updateExperiment,
  type ExperimentVariant,
} from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  variants: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        weight: z.number().int().min(0).max(100),
      }),
    )
    .min(2)
    .max(8)
    .optional(),
  metrics: z.array(z.string().min(1).max(64)).min(1).max(20).optional(),
});

export const GET = withMetrics(
  "/api/admin/experiments/[id]",
  async (req: NextRequest, ctx?: unknown) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const experiment = await getExperimentById(id);
    if (!experiment) return err("Not found", 404);
    return ok({ experiment });
  },
);

export const PUT = withMetrics(
  "/api/admin/experiments/[id]",
  async (req: NextRequest, ctx?: unknown) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const parsed = await parseBody(req, updateSchema);
    if (!parsed.success) return parsed.error;

    try {
      const experiment = await updateExperiment(id, {
        name: parsed.data.name,
        description: parsed.data.description,
        variants: parsed.data.variants as ExperimentVariant[] | undefined,
        metrics: parsed.data.metrics,
      });
      return ok({ experiment });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update";
      const status = message.includes("not found") ? 404 : 400;
      return err(message, status);
    }
  },
);
