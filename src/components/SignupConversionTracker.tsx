"use client";

import { useEffect } from "react";
import { trackCanonicalConversion } from "@/lib/ad-tracking";
import { getStoredFirstTouchAttribution } from "@/lib/attribution";

const COOKIE_NAME = "trefolio_signup_conversion";

export default function SignupConversionTracker() {
  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
    );
    if (!match) return;

    const method = decodeURIComponent(match[1]) as
      | "google"
      | "apple";

    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;

    const attribution = getStoredFirstTouchAttribution();
    trackCanonicalConversion("signup_completed", {
      method,
      source: attribution?.source || "unknown",
      medium: attribution?.medium || "unknown",
      campaign: attribution?.campaign || "none",
    });
  }, []);

  return null;
}
