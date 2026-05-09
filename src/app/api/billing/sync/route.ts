import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserSubscription } from "@/lib/db";
import { effectivePlan } from "@/lib/subscription";
import { getStripeClient } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";
import { syncEntitlementsForUser } from "@/lib/idp/entitlements";
import { isIdpEnabled } from "@/lib/idp/config";

/**
 * Polls subscription state after checkout. With IdP, pulls entitlements from
 * user.trefolio.com instead of listing Stripe directly.
 */
export const POST = withMetrics("/api/billing/sync", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isIdpEnabled()) {
    const plan = await syncEntitlementsForUser(user.id);
    const resolved = plan ?? effectivePlan(user.plan, user.plan_expires_at);
    return NextResponse.json({
      plan: resolved,
      synced: plan !== null,
    });
  }

  if (!user.stripe_customer_id) {
    return NextResponse.json({ plan: user.plan });
  }

  try {
    const stripe = getStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    const activeSub = subs.data[0];
    const resolvedPlan = effectivePlan(user.plan, user.plan_expires_at);
    if (activeSub && resolvedPlan === "free") {
      const periodEnd = (activeSub as unknown as { current_period_end?: number }).current_period_end;
      const syncedPlan = "pro" as const;
      await updateUserSubscription(user.id, {
        plan: syncedPlan,
        stripeSubscriptionId: activeSub.id,
        planExpiresAt: activeSub.cancel_at_period_end && periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : "",
      });
      return NextResponse.json({ plan: syncedPlan, synced: true });
    }

    return NextResponse.json({ plan: resolvedPlan, synced: false });
  } catch (err) {
    console.error("Billing sync error:", err instanceof Error ? err.message : err);
    const fallbackPlan = effectivePlan(user.plan, user.plan_expires_at);
    return NextResponse.json({ plan: fallbackPlan, synced: false });
  }
});
