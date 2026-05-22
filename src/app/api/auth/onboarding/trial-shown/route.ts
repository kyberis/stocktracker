import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";
import { markTrialOfferShown } from "@/lib/trial-activation";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/auth/onboarding/trial-shown", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (session.onboardingCompleted) {
    return NextResponse.json({ error: "Onboarding already completed" }, { status: 400 });
  }

  await markTrialOfferShown(session.userId);
  await trackEvent(session.userId, "onboarding_trial_shown", { source: "onboarding" });

  return NextResponse.json({ ok: true });
});
