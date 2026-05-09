import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applyStripeEvent } from "@/lib/entitlements/apply-stripe-event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // raw body parsing requires nodejs runtime

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  return _stripe;
}

/**
 * POST /api/billing/webhook
 * Stripe webhook receiver. Updates Entitlement and StripeCustomer rows.
 *
 * Configure in Stripe Dashboard with the SAME secret as trefolio's webhook
 * (because it's the same Stripe account). Both endpoints will fire on every
 * event during the cutover; trefolio's stops mirroring subscription events when
 * the product IdP OAuth client is fully configured (`isIdpEnabled()` in trefolio).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await applyStripeEvent(event);
  } catch (err) {
    console.error("[stripe] handler failed", event.type, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
