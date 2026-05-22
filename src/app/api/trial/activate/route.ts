import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { activateProTrial, getTrialEligibilityError } from "@/lib/trial-activation";
import { withMetrics } from "@/lib/with-metrics";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Invalid or expired trial token",
  already_activated: "Trial already activated",
  not_free_plan: "Already on a paid plan",
  user_not_found: "User not found",
};

export const POST = withMetrics("/api/trial/activate", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let token: unknown;
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof token !== "string" || token.trim() === "") {
    return NextResponse.json({ error: "Invalid or missing token" }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const eligibilityError = getTrialEligibilityError(user, { token });
  if (eligibilityError) {
    return NextResponse.json({ error: ERROR_MESSAGES[eligibilityError] }, { status: 400 });
  }

  const { planExpiresAt } = await activateProTrial(session.userId);
  return NextResponse.json({ success: true, planExpiresAt });
});
