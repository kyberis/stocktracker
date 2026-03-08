import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, trackEvent, updateUserSubscription, countProSubscribers, isFeatureEnabled } from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { getBillingBaseUrl, getStripeClient } from "@/lib/stripe";
import { parseBody } from "@/lib/api-response";
import { checkoutSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/billing/checkout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, checkoutSchema);
  if (!result.success) return result.error;
  const { deviceGrant } = result.data;
  const interval = deviceGrant ? "annual" : result.data.interval;

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

  if (deviceGrant) {
    if (!(await isFeatureEnabled("device_enabled"))) {
      return NextResponse.json({ error: "Device features are not enabled" }, { status: 404 });
    }
    if (!user.device_linked_at) {
      return NextResponse.json({ error: "No device linked to this account" }, { status: 400 });
    }
    if (user.device_pro_redeemed_at) {
      return NextResponse.json({ error: "Device free year has already been redeemed" }, { status: 400 });
    }
    const couponId = process.env.STRIPE_COUPON_DEVICE_FREE_YEAR;
    if (!couponId) {
      return NextResponse.json({ error: "Device coupon is not configured" }, { status: 501 });
    }
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
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?billing=success`,
      cancel_url: `${baseUrl}/profile?billing=cancelled`,
      metadata: {
        userId: user.id,
        interval,
        ...(deviceGrant ? { deviceGrant: "true" } : {}),
      },
    };

    if (deviceGrant) {
      checkoutParams.discounts = [{ coupon: process.env.STRIPE_COUPON_DEVICE_FREE_YEAR! }];
    }

    const checkout = await stripe.checkout.sessions.create(checkoutParams);

    trackEvent(user.id, "billing_checkout_started", {
      interval,
      source: deviceGrant ? "device_grant" : "billing_api",
    });

    billingEventsTotal.inc({ event: deviceGrant ? "device_grant_checkout_started" : "checkout_started" });
    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create checkout session:", msg);

    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 501 });
    }
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
});
