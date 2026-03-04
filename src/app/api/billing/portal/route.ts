import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, trackEvent } from "@/lib/db";
import { billingEventsTotal } from "@/lib/metrics";
import { getBillingBaseUrl, getStripeClient } from "@/lib/stripe";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/billing/portal", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found for this account" }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const baseUrl = getBillingBaseUrl(new URL(req.url).origin);
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/profile`,
    });
    trackEvent(user.id, "billing_portal_opened", { source: "billing_api" });
    billingEventsTotal.inc({ event: "portal_opened" });
    return NextResponse.redirect(portal.url, { status: 302 });
  } catch (err) {
    console.error("Failed to create billing portal session:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
});
