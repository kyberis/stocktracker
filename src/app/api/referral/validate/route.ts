import { NextRequest } from "next/server";
import { ok, err, parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { findUserByReferralCode } from "@/lib/db";
import { z } from "zod";

const validateSchema = z.object({
  code: z.string().min(1).max(16),
});

export const POST = withMetrics("/api/referral/validate", async (req: NextRequest) => {
  const parsed = await parseBody(req, validateSchema);
  if (!parsed.success) return parsed.error;

  const referrer = await findUserByReferralCode(parsed.data.code);
  if (!referrer) return ok({ valid: false, referrerDisplayName: "" });

  return ok({
    valid: true,
    referrerDisplayName: referrer.display_name || referrer.username,
  });
});
