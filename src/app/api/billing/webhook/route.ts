import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  trackEvent,
  updateUserSubscription,
} from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { getStripeClient } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";

function stripeCustomerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id;
}

async function resolveUserFromSubscription(
  subscription: Stripe.Subscription
): Promise<{ id: string } | null> {
  const bySub = await findUserByStripeSubscriptionId(subscription.id);
  if (bySub) return { id: bySub.id };
  const customerId = stripeCustomerId(subscription.customer);
  if (!customerId) return null;
  const byCustomer = await findUserByStripeCustomerId(customerId);
  if (byCustomer) return { id: byCustomer.id };
  return null;
}

function periodEndIso(subscription: Stripe.Subscription): string {
  const end = (subscription as unknown as { current_period_end?: number }).current_period_end;
  if (!end) return "";
  return new Date(end * 1000).toISOString();
}

export const POST = withMetrics("/api/billing/webhook", async (req: NextRequest) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  let body: string;
  try {
    body = await req.text();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid webhook signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  billingEventsTotal.inc({ event: "webhook_received" });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = stripeCustomerId(session.customer as string | Stripe.Customer | null);
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "";
        if (userId) {
          const user = await findUserById(userId);
          if (user) {
            await updateUserSubscription(user.id, {
              plan: "pro",
              stripeCustomerId: customerId || user.stripe_customer_id,
              stripeSubscriptionId: subscriptionId || user.stripe_subscription_id,
              planExpiresAt: "",
            });
            trackEvent(user.id, "billing_checkout_completed", {
              source: "stripe_webhook",
              mode: "subscription",
            });
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await resolveUserFromSubscription(subscription);
        if (!user) break;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const nextPlan =
          status === "active" || status === "trialing" || status === "past_due" ? "pro" : "free";
        const nextExpiresAt = cancelAtPeriodEnd ? periodEndIso(subscription) : "";
        await updateUserSubscription(user.id, {
          plan: nextPlan,
          stripeCustomerId: stripeCustomerId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          planExpiresAt: nextExpiresAt,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await resolveUserFromSubscription(subscription);
        if (!user) break;
        await updateUserSubscription(user.id, {
          plan: "free",
          stripeSubscriptionId: "",
          planExpiresAt: "",
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Billing webhook handling error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});
