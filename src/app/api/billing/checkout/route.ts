import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, trackEvent, updateUserSubscription, countProSubscribers, isFeatureEnabledForUser, getStripePriceConfig } from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { getBillingBaseUrl, getStripeClient } from "@/lib/stripe";
import { parseBody } from "@/lib/api-response";
import { checkoutSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { billingRedirectToIdp, getIdpIssuer } from "@/lib/idp/config";

async function getPriceId(interval: "monthly" | "annual"): Promise<string> {
  return interval === "annual"
    ? getStripePriceConfig("stripe_price_pro_annual")
    : getStripePriceConfig("stripe_price_pro_monthly");
}

export const POST = withMetrics("/api/billing/checkout", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, checkoutSchema);
  if (!result.success) return result.error;
  const { deviceGrant } = result.data;
  const interval = deviceGrant ? "annual" : result.data.interval;

  // After IdP cutover the IdP is the only place that runs Stripe checkout.
  // Local route returns a JSON redirect target that the client follows.
  // Device-grant flows still run locally because they require trefolio-side
  // device-link state that the IdP doesn't (yet) own.
  if (billingRedirectToIdp() && !deviceGrant) {
    const idpPublic = getIdpIssuer();
    if (idpPublic) {
      const target = new URL(`${idpPublic}/upgrade`);
      target.searchParams.set("from", "trefolio");
      target.searchParams.set("interval", interval);
      return NextResponse.json({ url: target.toString() }, { status: 200 });
    }
  }

  const priceId = await getPriceId(interval);
  if (!priceId) {
    return NextResponse.json({ error: "Billing plan is not configured" }, { status: 501 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (deviceGrant) {
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
        plan: "pro",
        interval,
        ...(deviceGrant ? { deviceGrant: "true" } : {}),
      },
    };

    if (deviceGrant) {
      const coupon = await getStripePriceConfig("stripe_coupon_device_free_year");
      checkoutParams.discounts = [{ coupon }];
    }

    const checkout = await stripe.checkout.sessions.create(checkoutParams);

    trackEvent(user.id, "billing_checkout_started", {
      plan: "pro",
      interval,
      source: deviceGrant ? "device_grant" : "billing_api",
    });
    trackEvent(user.id, "checkout_started", {
      plan: "pro",
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
