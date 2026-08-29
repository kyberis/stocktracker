export const CANONICAL_CONVERSION_EVENTS = [
  "signup_completed",
  "checkout_started",
  "checkout_completed",
] as const;

export type CanonicalConversionEvent = (typeof CANONICAL_CONVERSION_EVENTS)[number];

export type CanonicalConversionPayload = Partial<{
  plan: "free" | "basic" | "pro" | "wealth";
  interval: "monthly" | "annual";
  method: "credentials" | "google" | "apple";
  source: string;
  medium: string;
  campaign: string;
}>;

export function isCanonicalConversionEvent(value: string): value is CanonicalConversionEvent {
  return (CANONICAL_CONVERSION_EVENTS as readonly string[]).includes(value);
}

