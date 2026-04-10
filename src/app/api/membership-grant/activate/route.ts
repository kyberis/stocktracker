import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { applyPendingMembershipGrant, findUserById, trackEvent } from "@/lib/db";
import { reconcileSnapTrade, reconcileTheme } from "@/lib/billing-reconcile";
import { hasActiveManagedStripeSubscription } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/membership-grant/activate", async (req: NextRequest) => {
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

  if (await hasActiveManagedStripeSubscription(user.stripe_subscription_id)) {
    return NextResponse.json(
      {
        error:
          "You have an active paid subscription in Stripe. Contact support if you need help combining this with a complimentary grant.",
      },
      { status: 409 },
    );
  }

  const result = await applyPendingMembershipGrant(session.userId, token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await reconcileSnapTrade(session.userId, result.plan);
  await reconcileTheme(session.userId, result.plan);
  await trackEvent(session.userId, "membership_grant_activated", { plan: result.plan });

  return NextResponse.json({
    success: true,
    planExpiresAt: result.planExpiresAt,
    plan: result.plan,
  });
});
