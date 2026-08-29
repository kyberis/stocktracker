import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, trackEvent } from "@/lib/db";
import { activateProTrial, getTrialEligibilityError } from "@/lib/trial-activation";
import { withMetrics } from "@/lib/with-metrics";
import { enqueueProdOpsTrialActivatedEvent } from "@/lib/prodops";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Invalid or expired trial token",
  already_activated: "Trial already activated",
  not_free_plan: "Already on a paid plan",
  user_not_found: "User not found",
};

export const POST = withMetrics("/api/trial/activate", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let token: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.token === "string" && body.token.trim()) {
      token = body.token.trim();
    }
  } catch {
    token = undefined;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const eligibilityError = getTrialEligibilityError(user, token ? { token } : undefined);
  if (eligibilityError) {
    return NextResponse.json({ error: ERROR_MESSAGES[eligibilityError] }, { status: 400 });
  }

  const { planExpiresAt } = await activateProTrial(session.userId);
  await trackEvent(session.userId, "onboarding_trial_activated", { source: "activation_link" });
  await enqueueProdOpsTrialActivatedEvent({
    userId: session.userId,
    source: "activation_link",
    planExpiresAt,
  });
  return NextResponse.json({ success: true, planExpiresAt });
});
