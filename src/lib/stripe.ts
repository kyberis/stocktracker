import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripeClient = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
  });
  return stripeClient;
}

export function getBillingBaseUrl(fallbackOrigin?: string): string {
  return process.env.APP_BASE_URL || fallbackOrigin || "http://localhost:3000";
}
