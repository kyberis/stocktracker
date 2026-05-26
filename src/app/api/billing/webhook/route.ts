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
import { reconcileSnapTrade, reconcileTheme } from "@/lib/billing-reconcile";
import { sendTrefolioUpgradeEmail, sendAdminSubscriptionNotification } from "@/lib/email";
import { billingEventsTotal } from "@/lib/metrics";
import { getStripeClient } from "@/lib/stripe";
import { ensureInitialized } from "@/lib/db/client";
import { withMetrics } from "@/lib/with-metrics";
import { createNotification } from "@/lib/db";
import {
  trefolioUpgradeNotification,
  downgradeNotification,
  planExpiredNotification,
} from "@/lib/notification-templates";
import { isIdpEnabled } from "@/lib/idp/config";
import { enqueueProdOpsMembershipPaidEvent } from "@/lib/prodops";

function stripeCustomerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id;
}

async function resolveUserFromSubscription(
  subscription: Stripe.Subscription,
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

/** Legacy Bifolio (starter) Stripe prices map to pro entitlements. */
async function planFromSubscription(_subscription: Stripe.Subscription, _metadataPlan?: string): Promise<"pro"> {
  return "pro";
}

/**
 * Leaf hardware free-year checkout completed — update Turso + redeem flag.
 * IdP webhook (`user.trefolio.com`) also receives this event and owns entitlements.
 */
async function handleDeviceGrantCheckoutCompleted(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.metadata?.deviceGrant !== "true") return false;

  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = stripeCustomerId(session.customer as string | Stripe.Customer | null);
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "";
  const checkoutPlan = "pro" as const;
  if (!userId) return true;

  const user = await findUserById(userId);
  if (!user) return true;

  await updateUserSubscription(user.id, {
    plan: checkoutPlan,
    stripeCustomerId: customerId || user.stripe_customer_id,
    stripeSubscriptionId: subscriptionId || user.stripe_subscription_id,
    planExpiresAt: "",
  });
  if (user.trial_activated_at) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET trial_expired_notified = 1 WHERE id = ? AND trial_activated_at != ''",
      args: [user.id],
    });
  }
  await markDeviceProRedeemed(user.id);

  trackEvent(user.id, "billing_checkout_completed", {
    source: "stripe_webhook",
    plan: checkoutPlan,
    mode: "device_grant",
  });
  trackEvent(user.id, "checkout_completed", {
    source: "stripe_webhook",
    plan: checkoutPlan,
    mode: "device_grant",
  });
  await enqueueProdOpsMembershipPaidEvent({
    userId: user.id,
    plan: checkoutPlan,
    source: "stripe_webhook",
    externalId: session.id,
    mode: "device_grant",
  });
  sendTrefolioUpgradeEmail(user.email, user.display_name || "", "en", user.id).catch((err) =>
    console.error("Upgrade email failed:", err),
  );
  const upgradeNotif = trefolioUpgradeNotification();
  createNotification(user.id, upgradeNotif).catch((err) =>
    console.error("Upgrade notification failed:", err),
  );
  sendAdminSubscriptionNotification(user.id, user.email, user.display_name || "", checkoutPlan, "new_subscription").catch(
    (err) => console.error("Admin subscription notification failed:", err),
  );
  return true;
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
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  billingEventsTotal.inc({ event: "webhook_received" });

  // IdP owns normal Pro subscriptions; this deployment only applies Turso side-effects for device grant.
  if (isIdpEnabled()) {
    try {
      if (event.type === "checkout.session.completed") {
        await handleDeviceGrantCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      }
    } catch (err) {
      console.error("[billing/webhook] Device grant handler failed:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
    }
    return NextResponse.json({ received: true, mode: "idp_owned_device_mirror" }, { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (await handleDeviceGrantCheckoutCompleted(session)) {
          break;
        }
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = stripeCustomerId(session.customer as string | Stripe.Customer | null);
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "";
        const checkoutPlan = "pro" as const;
        if (userId) {
          const user = await findUserById(userId);
          if (user) {
            await updateUserSubscription(user.id, {
              plan: checkoutPlan,
              stripeCustomerId: customerId || user.stripe_customer_id,
              stripeSubscriptionId: subscriptionId || user.stripe_subscription_id,
              planExpiresAt: "",
            });
            if (user.trial_activated_at) {
              const client = await ensureInitialized();
              await client.execute({
                sql: "UPDATE users SET trial_expired_notified = 1 WHERE id = ? AND trial_activated_at != ''",
                args: [user.id],
              });
            }
            if (session.metadata?.deviceGrant === "true") {
              await markDeviceProRedeemed(user.id);
            }
            trackEvent(user.id, "billing_checkout_completed", {
              source: "stripe_webhook",
              plan: checkoutPlan,
              mode: session.metadata?.deviceGrant === "true" ? "device_grant" : "subscription",
            });
            trackEvent(user.id, "checkout_completed", {
              source: "stripe_webhook",
              plan: checkoutPlan,
              mode: session.metadata?.deviceGrant === "true" ? "device_grant" : "subscription",
            });
            await enqueueProdOpsMembershipPaidEvent({
              userId: user.id,
              plan: checkoutPlan,
              source: "stripe_webhook",
              externalId: session.id,
              mode: session.metadata?.deviceGrant === "true" ? "device_grant" : "subscription",
            });
            sendTrefolioUpgradeEmail(user.email, user.display_name || "", "en", user.id).catch((err) =>
              console.error("Upgrade email failed:", err),
            );
            const upgradeNotif = trefolioUpgradeNotification();
            createNotification(user.id, upgradeNotif).catch((err) =>
              console.error("Upgrade notification failed:", err),
            );
            sendAdminSubscriptionNotification(
              user.id,
              user.email,
              user.display_name || "",
              checkoutPlan,
              "new_subscription",
            ).catch((err) => console.error("Admin subscription notification failed:", err));
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
        const nextPlan = isActive ? await planFromSubscription(subscription, subscription.metadata?.plan) : "free";
        const nextExpiresAt = cancelAtPeriodEnd ? periodEndIso(subscription) : "";
        await updateUserSubscription(user.id, {
          plan: nextPlan,
          stripeCustomerId: stripeCustomerId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          planExpiresAt: nextExpiresAt,
        });
        if (cancelAtPeriodEnd && nextExpiresAt) {
          createNotification(user.id, downgradeNotification(nextExpiresAt)).catch((err) =>
            console.error("Downgrade notification failed:", err),
          );
        }
        const fullUser = await findUserById(user.id);
        if (fullUser) {
          sendAdminSubscriptionNotification(
            fullUser.id,
            fullUser.email,
            fullUser.display_name || "",
            nextPlan,
            "plan_change",
          ).catch((err) => console.error("Admin subscription notification failed:", err));
        }
        await reconcileSnapTrade(user.id, nextPlan);
        await reconcileTheme(user.id, nextPlan);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await resolveUserFromSubscription(subscription);
        if (!user) break;

        const periodEnd = periodEndIso(subscription);
        const stillHasTime = periodEnd && new Date(periodEnd) > new Date();

        if (stillHasTime) {
          await updateUserSubscription(user.id, {
            stripeSubscriptionId: "",
            planExpiresAt: periodEnd,
          });
        } else {
          await updateUserSubscription(user.id, {
            plan: "free",
            stripeSubscriptionId: "",
            planExpiresAt: "",
          });
          await reconcileSnapTrade(user.id, "free");
          await reconcileTheme(user.id, "free");
          createNotification(user.id, planExpiredNotification()).catch((err) =>
            console.error("Plan-expired notification failed:", err),
          );
        }

        const fullUser = await findUserById(user.id);
        if (fullUser) {
          sendAdminSubscriptionNotification(
            fullUser.id,
            fullUser.email,
            fullUser.display_name || "",
            "free",
            "cancellation",
          ).catch((err) => console.error("Admin cancellation notification failed:", err));
        }
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
