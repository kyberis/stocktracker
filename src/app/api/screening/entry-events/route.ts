import { type NextRequest } from "next/server";
import { parseBody, ok } from "@/lib/api-response";
import { trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { requireScreeningAccess } from "@/lib/screening/guard";
import { recordScreeningEntryMetric } from "@/lib/screening/metrics";
import { screeningEntryEventBodySchema } from "@/lib/screening/schemas";

/**
 * First-party product analytics for the screening entry funnel.
 * Dual-written with client GA via useTrack; Prometheus counters updated here.
 */
export const POST = withMetrics("/api/screening/entry-events", async (req: NextRequest) => {
  const { session, error } = await requireScreeningAccess(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, screeningEntryEventBodySchema);
  if (!parsed.success) return parsed.error;

  const { event, metadata } = parsed.data;
  await trackEvent(session.userId, event, metadata);
  recordScreeningEntryMetric(event, metadata);

  return ok({ ok: true });
});
