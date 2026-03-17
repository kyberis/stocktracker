import type { CanonicalConversionEvent } from "@/lib/conversion-events";

export function mapCanonicalToMetaEvent(event: CanonicalConversionEvent): string {
  switch (event) {
    case "signup_completed":
      return "CompleteRegistration";
    case "checkout_started":
      return "InitiateCheckout";
    case "checkout_completed":
      return "Purchase";
    default:
      return event;
  }
}

