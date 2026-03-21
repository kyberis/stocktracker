import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  markDeviceProRedeemed,
  trackEvent,
  updateUserSubscription,
  getStripePriceConfig,
  getSnapTradeConnection,
  scheduleSnapTradeDeletion,
  clearSnapTradeDeletion,
  getUserSettings,
  updateUserSettings,
} from "@/lib/db";
import { canAccessTheme } from "@/lib/subscription";
import { sendBifolioUpgradeEmail, sendTrefolioUpgradeEmail, sendAdminSubscriptionNotification } from "@/lib/email";
import { billingEventsTotal } from "@/lib/metrics";
import { getStripeClient } from "@/lib/stripe";
import { ensureInitialized } from "@/lib/db/client";
import { withMetrics } from "@/lib/with-metrics";
import { createNotification } from "@/lib/db";
import {
  bifolioUpgradeNotification,
  trefolioUpgradeNotification,
  downgradeNotification,
  planExpiredNotification,
} from "@/lib/notification-templates";

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

async function getStarterPriceIds(): Promise<Set<string>> {
  const ids = [
    await getStripePriceConfig("stripe_price_starter_monthly"),
    await getStripePriceConfig("stripe_price_starter_annual"),
  ].filter(Boolean);
  return new Set(ids);
}

async function planFromSubscription(subscription: Stripe.Subscription, metadataPlan?: string): Promise<"starter" | "pro"> {
  if (metadataPlan === "starter") return "starter";
  const items = subscription.items?.data;
  if (items?.length) {
    const priceId = typeof items[0].price === "string" ? items[0].price : items[0].price?.id;
    const starterIds = await getStarterPriceIds();
    if (priceId && starterIds.has(priceId)) return "starter";
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
            const sendUpgradeEmail =
              checkoutPlan === "starter" ? sendBifolioUpgradeEmail : sendTrefolioUpgradeEmail;
            sendUpgradeEmail(user.email, user.display_name || "", "en", user.id).catch((err) =>
              console.error("Upgrade email failed:", err),
            );
            const upgradeNotif =
              checkoutPlan === "starter" ? bifolioUpgradeNotification() : trefolioUpgradeNotification();
            createNotification(user.id, upgradeNotif).catch((err) =>
              console.error("Upgrade notification failed:", err),
            );
            sendAdminSubscriptionNotification(
              user.id, user.email, user.display_name || "", checkoutPlan, "new_subscription",
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
            fullUser.id, fullUser.email, fullUser.display_name || "", nextPlan, "plan_change",
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

/**
 * Reset dashboard theme to default if the user's current theme
 * is no longer available on their new plan.
 */
async function reconcileTheme(userId: string, newPlan: string): Promise<void> {
  try {
    const settings = await getUserSettings(userId);
    const plan = (newPlan || "free") as import("@/lib/types").SubscriptionPlan;
    if (!canAccessTheme(settings.dashboardTheme, plan)) {
      await updateUserSettings(userId, { dashboardTheme: "default" });
    }
  } catch (err) {
    console.error("[billing/webhook] Theme reconcile error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Schedule or cancel SnapTrade user deletion based on plan change.
 * When a user drops to Free: schedule deletion after 1 hour (stops $2/user/month).
 * When a user gains Starter or Pro: cancel any pending deletion.
 */
async function reconcileSnapTrade(userId: string, newPlan: string): Promise<void> {
  try {
    const conn = await getSnapTradeConnection(userId);
    if (!conn) return;

    if (newPlan === "pro" || newPlan === "starter") {
      await clearSnapTradeDeletion(userId);
    } else {
      await scheduleSnapTradeDeletion(userId);
    }
  } catch (err) {
    console.error("[billing/webhook] SnapTrade reconcile error:", err instanceof Error ? err.message : err);
  }
}
