import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, trackEvent, updateUserSubscription, countProSubscribers } from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { getBillingBaseUrl, getStripeClient } from "@/lib/stripe";
import type { BillingInterval } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/billing/checkout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: { interval?: BillingInterval } = {};
  try {
    body = (await req.json()) as { interval?: BillingInterval };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const interval: BillingInterval = body.interval === "annual" ? "annual" : "monthly";
  const priceId =
    interval === "annual"
      ? process.env.STRIPE_PRICE_PRO_ANNUAL
      : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) {
    return NextResponse.json({ error: "Billing plan is not configured" }, { status: 501 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.plan !== "pro") {
    const proCount = await countProSubscribers();
    if (proCount >= PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS) {
      billingEventsTotal.inc({ event: "checkout_capacity_blocked" });
      return NextResponse.json(
        {
          error: "Pro plan is currently at capacity. Please try again later.",
          reason: "capacity_reached",
        },
        { status: 503 }
      );
    }
  }

  try {
    const stripe = getStripeClient();
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.display_name || user.username,
        metadata: { userId: user.id, username: user.username },
      });
      customerId = customer.id;
      await updateUserSubscription(user.id, { stripeCustomerId: customer.id });
    }

    const baseUrl = getBillingBaseUrl(new URL(req.url).origin);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?billing=success`,
      cancel_url: `${baseUrl}/profile?billing=cancelled`,
      metadata: {
        userId: user.id,
        interval,
      },
    });

    trackEvent(user.id, "billing_checkout_started", {
      interval,
      source: "billing_api",
    });

    billingEventsTotal.inc({ event: "checkout_started" });
    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const stripeErr = err as { type?: string; code?: string; message?: string };
    const detail = stripeErr.message || (err instanceof Error ? err.message : String(err));
    console.error("Failed to create checkout session:", detail);

    if (detail.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 501 });
    }
    return NextResponse.json(
      { error: "Failed to create checkout session", detail },
      { status: 500 },
    );
  }
});
