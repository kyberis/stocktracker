import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ok } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";
import { ensureReferralCode, getReferralStats, trackEvent } from "@/lib/db";

export const GET = withMetrics("/api/referral/code", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const code = await ensureReferralCode(session.userId);
  const stats = await getReferralStats(session.userId);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const link = `${baseUrl}/signup?ref=${code}`;

  await trackEvent(session.userId, "referral_link_viewed");

  return ok({ code, link, stats });
});
