import Stripe from "stripe";
import { trackExternalProvider } from "@/lib/traffic/provider-track";

let stripeClient: Stripe | null = null;

function trackableStripeClient(client: Stripe): Stripe {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          trackExternalProvider("stripe");
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      if (value && typeof value === "object") {
        return trackableStripeClient(value as Stripe);
      }
      return value;
    },
  });
}

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripeClient = trackableStripeClient(
    new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
    }),
  );
  return stripeClient;
}

export function getBillingBaseUrl(fallbackOrigin?: string): string {
  return process.env.APP_BASE_URL || fallbackOrigin || "http://localhost:3000";
}

/**
 * Returns true if the subscription is still billed in Stripe (webhook-managed).
 * Used to block complimentary DB grants while Stripe controls the plan.
 */
export async function hasActiveManagedStripeSubscription(stripeSubscriptionId: string): Promise<boolean> {
  if (!stripeSubscriptionId?.trim()) return false;
  try {
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    return sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  } catch {
    return false;
  }
}
