import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireSession } from "@/lib/auth/guards";
import {
  findUserById,
  trackEvent,
  updateUserSubscription,
  countProSubscribers,
  isFeatureEnabledForUser,
  getStripePriceConfig,
} from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { getBillingBaseUrl, getStripeClient } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";
import {
  authProbeLog,
  authProbeWarn,
} from "@/lib/auth/login-probe-log";

/**
 * POST /api/billing/device-checkout
 *
 * One-off Stripe Checkout for the Leaf hardware **free Pro year** coupon.
 * Subscription management for normal Pro lives on user.trefolio.com (IdP).
 *
 * Requires a linked IdP identity (`users.idp_sub`) so Stripe metadata can
 * include canonical `sub` for the IdP webhook (`external/accounts`).
 */
export const POST = withMetrics("/api/billing/device-checkout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  authProbeLog(
    "device_checkout.accepted",
    { userId: session.userId },
    req.headers,
  );

  const priceId = await getStripePriceConfig("stripe_price_pro_annual");
  if (!priceId) {
    return NextResponse.json({ error: "Billing plan is not configured" }, { status: 501 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const idpSub = user.idp_sub?.trim();
  if (!idpSub) {
    return NextResponse.json(
      { error: "unified_account_required", message: "Sign in with your trefolio account to claim the device offer." },
      { status: 400 },
    );
  }

  if (!(await isFeatureEnabledForUser("device_enabled", session.userId))) {
    return NextResponse.json({ error: "Device features are not enabled" }, { status: 404 });
  }
  if (!user.device_linked_at) {
    return NextResponse.json({ error: "No device linked to this account" }, { status: 400 });
  }
  if (user.device_pro_redeemed_at) {
    return NextResponse.json({ error: "Device free year has already been redeemed" }, { status: 400 });
  }
  const couponId = await getStripePriceConfig("stripe_coupon_device_free_year");
  if (!couponId) {
    return NextResponse.json({ error: "Device coupon is not configured" }, { status: 501 });
  }

  if (user.plan !== "pro") {
    const proCount = await countProSubscribers();
    if (proCount >= PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS) {
      billingEventsTotal.inc({ event: "checkout_capacity_blocked" });
      return NextResponse.json(
        {
          error: "Paid plans are currently at capacity. Please try again later.",
          reason: "capacity_reached",
        },
        { status: 503 },
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
        metadata: { userId: user.id, username: user.username, idp_sub: idpSub },
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
        sub: idpSub,
        userId: user.id,
        plan: "pro",
        interval: "annual",
        deviceGrant: "true",
      },
      subscription_data: {
        metadata: {
          sub: idpSub,
          deviceGrant: "true",
        },
      },
    };

    const coupon = await getStripePriceConfig("stripe_coupon_device_free_year");
    checkoutParams.discounts = [{ coupon }];

    authProbeLog(
      "device_checkout.stripe_create_begin",
      {
        userId: user.id,
        hasStripeCustomerId: Boolean(customerId),
      },
      req.headers,
    );
    const checkout = await stripe.checkout.sessions.create(checkoutParams);
    authProbeLog(
      "device_checkout.stripe_create_ok",
      {
        userId: user.id,
        sessionIdSuffix: checkout.id.slice(-12),
      },
      req.headers,
    );

    trackEvent(user.id, "billing_checkout_started", {
      plan: "pro",
      interval: "annual",
      source: "device_grant",
    });
    trackEvent(user.id, "checkout_started", {
      plan: "pro",
      interval: "annual",
      source: "device_grant",
    });

    billingEventsTotal.inc({ event: "device_grant_checkout_started" });

    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to create device checkout session:", msg);
    authProbeWarn(
      "device_checkout.stripe_error",
      {
        userId: session.userId,
        msgPreview: msg.slice(0, 280),
      },
      req.headers,
    );

    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 501 });
    }
    return NextResponse.json(
      { error: "Failed to create checkout session", message: msg },
      { status: 500 },
    );
  }
});
