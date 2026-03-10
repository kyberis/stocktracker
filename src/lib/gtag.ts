export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export const CONSENT_KEY = "trefolio_cookie_consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "all";
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || !hasAnalyticsConsent()) return;
  window.gtag?.("config", GA_MEASUREMENT_ID, { page_path: url });
}

export function event(
  action: string,
  params?: Record<string, string>,
) {
  if (!GA_MEASUREMENT_ID || !hasAnalyticsConsent()) return;
  window.gtag?.("event", action, params);
}

export function consentUpdate(granted: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}
