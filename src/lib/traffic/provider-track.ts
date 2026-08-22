import { providerRequestsTotal } from "@/lib/metrics";

import { getTrafficApiGroup } from "./request-context";
import { trackTrafficEdge } from "./track";

/** Record Prometheus provider metrics + Redis api→provider edge when request context is set. */
export function recordProviderRequest(
  provider: string,
  operation: string,
  status: "success" | "error",
): void {
  providerRequestsTotal.inc({ provider, operation, status });

  const apiGroup = getTrafficApiGroup();
  if (!apiGroup) return;

  trackTrafficEdge("api_provider", apiGroup, `provider:${provider}`);
}

/** Track a non-market-data external call (Stripe, Resend, Clara, etc.). */
export function trackExternalProvider(provider: string): void {
  const apiGroup = getTrafficApiGroup();
  if (!apiGroup) return;

  trackTrafficEdge("api_provider", apiGroup, `provider:${provider}`);
}
