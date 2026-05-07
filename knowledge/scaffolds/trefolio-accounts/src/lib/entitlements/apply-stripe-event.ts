import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Process a Stripe webhook event and update Entitlement + StripeCustomer
 * atomically. Mirror of trefolio's existing webhook handler at
 * src/app/api/billing/webhook/route.ts but writing to the IdP's tables.
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) {
        console.error("[stripe] checkout.session.completed without userId metadata", session.id);
        return;
      }
      if (!session.subscription || !session.customer) return;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer.id;

      // Pull the actual subscription so we have currentPeriodEnd.
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const currentPeriodEnd = new Date(sub.current_period_end * 1000);

      await db.$transaction([
        db.stripeCustomer.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            currentPeriodEnd,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
          },
        }),
        db.entitlement.upsert({
          where: { userId },
          create: { userId, plan: "pro", proUntil: currentPeriodEnd, source: "stripe" },
          update: { plan: "pro", proUntil: currentPeriodEnd, source: "stripe" },
        }),
      ]);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const customer = await db.stripeCustomer.findUnique({ where: { stripeCustomerId: customerId } });
      if (!customer) {
        console.warn("[stripe] subscription event for unknown customer", customerId);
        return;
      }
      const isActive = sub.status === "active" || sub.status === "trialing";
      const currentPeriodEnd = new Date(sub.current_period_end * 1000);

      await db.$transaction([
        db.stripeCustomer.update({
          where: { userId: customer.userId },
          data: {
            stripeSubscriptionId: sub.id,
            currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        }),
        db.entitlement.upsert({
          where: { userId: customer.userId },
          create: {
            userId: customer.userId,
            plan: isActive ? "pro" : "free",
            proUntil: isActive ? currentPeriodEnd : null,
            source: "stripe",
          },
          update: {
            plan: isActive ? "pro" : "free",
            proUntil: isActive ? currentPeriodEnd : null,
            source: "stripe",
          },
        }),
      ]);
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const customer = await db.stripeCustomer.findUnique({ where: { stripeCustomerId: customerId } });
      if (!customer) return;

      // Grace period: if currentPeriodEnd is in the future, keep pro until then.
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
      const stillInPeriod = currentPeriodEnd ? currentPeriodEnd.getTime() > Date.now() : false;

      await db.entitlement.update({
        where: { userId: customer.userId },
        data: {
          plan: stillInPeriod ? "pro" : "free",
          proUntil: stillInPeriod ? currentPeriodEnd : null,
          source: "stripe",
        },
      });
      return;
    }

    default:
      // Ignore other events for now.
      return;
  }
}

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  return _stripe;
}
