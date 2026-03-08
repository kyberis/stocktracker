import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  markDeviceProRedeemed,
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

const STARTER_PRICE_IDS = new Set(
  [process.env.STRIPE_PRICE_STARTER_MONTHLY, process.env.STRIPE_PRICE_STARTER_ANNUAL].filter(Boolean)
);

function planFromSubscription(subscription: Stripe.Subscription, metadataPlan?: string): "starter" | "pro" {
  if (metadataPlan === "starter") return "starter";
  const items = subscription.items?.data;
  if (items?.length) {
    const priceId = typeof items[0].price === "string" ? items[0].price : items[0].price?.id;
    if (priceId && STARTER_PRICE_IDS.has(priceId)) return "starter";
  }
  return "pro";
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
    console.error("[billing/webhook] Signature validation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
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
        const checkoutPlan = (session.metadata?.plan === "starter" ? "starter" : "pro") as "starter" | "pro";
        if (userId) {
          const user = await findUserById(userId);
          if (user) {
            await updateUserSubscription(user.id, {
              plan: checkoutPlan,
              stripeCustomerId: customerId || user.stripe_customer_id,
              stripeSubscriptionId: subscriptionId || user.stripe_subscription_id,
              planExpiresAt: "",
            });
            if (session.metadata?.deviceGrant === "true") {
              await markDeviceProRedeemed(user.id);
            }
            trackEvent(user.id, "billing_checkout_completed", {
              source: "stripe_webhook",
              plan: checkoutPlan,
              mode: session.metadata?.deviceGrant === "true" ? "device_grant" : "subscription",
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
        const isActive = status === "active" || status === "trialing" || status === "past_due";
        const nextPlan = isActive ? planFromSubscription(subscription, subscription.metadata?.plan) : "free";
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
