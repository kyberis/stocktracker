import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserSubscription, getStripePriceConfig } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";

/**
 * Polls the user's Stripe customer for an active subscription and syncs the
 * local plan accordingly. Called from the client after returning from Stripe
 * checkout to close the race between the redirect and webhook delivery.
 */
export const POST = withMetrics("/api/billing/sync", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    if (activeSub && user.plan === "free") {
      const starterPriceIds = new Set(
        [await getStripePriceConfig("stripe_price_starter_monthly"), await getStripePriceConfig("stripe_price_starter_annual")].filter(Boolean)
      );
      const items = activeSub.items?.data;
      const priceId = items?.[0]?.price?.id;
      const syncedPlan = priceId && starterPriceIds.has(priceId) ? "starter" as const : "pro" as const;
      const periodEnd = (activeSub as unknown as { current_period_end?: number }).current_period_end;
      await updateUserSubscription(user.id, {
        plan: syncedPlan,
        stripeSubscriptionId: activeSub.id,
        planExpiresAt: activeSub.cancel_at_period_end && periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : "",
      });
      return NextResponse.json({ plan: syncedPlan, synced: true });
    }

    return NextResponse.json({ plan: user.plan, synced: false });
  } catch (err) {
    console.error("Billing sync error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ plan: user.plan, synced: false });
  }
});
