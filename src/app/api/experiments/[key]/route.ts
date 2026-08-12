import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ok, err } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { resolveExperimentVariant } from "@/lib/db";

export const GET = withMetrics(
  "/api/experiments/[key]",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error;

    const { key } = await (ctx as { params: Promise<{ key: string }> }).params;
    if (!key || !/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      return err("Invalid experiment key", 400);
    }

    const resolved = await resolveExperimentVariant(session.userId, key);
    return ok({
      key: resolved.key,
      status: resolved.status,
      variant: resolved.variant,
      metrics: resolved.metrics,
      assigned: resolved.assigned,
    });
  },
);
