import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ok, err, parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import {
  createExperiment,
  listExperiments,
  type ExperimentVariant,
} from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  variants: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        weight: z.number().int().min(0).max(100),
      }),
    )
    .min(2)
    .max(8),
  metrics: z.array(z.string().min(1).max(64)).min(1).max(20),
});

export const GET = withMetrics("/api/admin/experiments", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const experiments = await listExperiments();
  return ok({ experiments });
});

export const POST = withMetrics("/api/admin/experiments", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const parsed = await parseBody(req, createSchema);
  if (!parsed.success) return parsed.error;

  try {
    const experiment = await createExperiment({
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description,
      variants: parsed.data.variants as ExperimentVariant[],
      metrics: parsed.data.metrics,
    });
    return ok({ experiment }, { status: 201 });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create experiment";
      const conflict =
        /unique/i.test(message) || /already exists/i.test(message);
      return err(message, conflict ? 409 : 400);
    }
});
