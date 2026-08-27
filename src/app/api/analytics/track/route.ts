import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ok, err, parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { trackEvent } from "@/lib/db";
import { z } from "zod";

const ALLOWED_EVENTS = new Set([
  "referral_link_copied",
  "referral_link_shared",
  "people_search",
  "feed_view",
  "onboarding_import_method",
  "account_delete_started",
  "import_error",
  "experiment_exposure",
  "empty_activation_cta",
  "agent_intro_completed",
  "agent_intro_skipped",
  "agent_intro_post_action",
  "display_invariant_violation",
  "first_stock_activation_shown",
  "first_stock_example_sent",
]);

const schema = z.object({
  event: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.string().max(128)).optional(),
});

export const POST = withMetrics("/api/analytics/track", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.error;

  if (!ALLOWED_EVENTS.has(parsed.data.event)) {
    return err("Unknown event", 400);
  }

  await trackEvent(session.userId, parsed.data.event, parsed.data.metadata);
  return ok({ ok: true });
});
