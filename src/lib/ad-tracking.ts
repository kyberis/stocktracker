"use client";

import { event as gtagEvent, hasAnalyticsConsent } from "@/lib/gtag";
import {
  isCanonicalConversionEvent,
  type CanonicalConversionEvent,
  type CanonicalConversionPayload,
} from "@/lib/conversion-events";
import { mapCanonicalToMetaEvent } from "@/lib/meta-conversions";

function sanitizePayload(
  payload: CanonicalConversionPayload = {}
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v).slice(0, 128);
  }
  return out;
}

export async function trackCanonicalConversion(
  eventName: CanonicalConversionEvent,
  payload: CanonicalConversionPayload = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isCanonicalConversionEvent(eventName)) return;
  if (!hasAnalyticsConsent()) return;

  const metadata = sanitizePayload(payload);
  const eventId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${eventName}_${Date.now()}`;

  // Google tag / Google Ads compatible event dispatch (via gtag).
  gtagEvent(eventName, metadata);

  // Optional Meta Pixel dispatch (disabled when NEXT_PUBLIC_META_PIXEL_ID is unset).
  if (typeof window.fbq === "function" && process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    window.fbq("track", mapCanonicalToMetaEvent(eventName), metadata, { eventID: eventId });
  }

  // Best-effort internal dispatch log for parity reporting.
  try {
    await fetch("/api/analytics/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: eventName,
        eventId,
        platform: "gtag",
        metadata,
      }),
    });
  } catch {
    // Ignore network failures — conversion events should not block UX.
  }
}

