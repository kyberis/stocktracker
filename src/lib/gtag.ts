let _gaId = "";

export function getGaId(): string {
  return _gaId;
}

export function setGaId(id: string) {
  _gaId = id;
}

export const CONSENT_KEY = "trefolio_cookie_consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "all";
}

export function pageview(url: string) {
  if (!_gaId || !hasAnalyticsConsent()) return;
  window.gtag?.("config", _gaId, { page_path: url });
}

export function event(
  action: string,
  params?: Record<string, string>,
) {
  if (!_gaId || !hasAnalyticsConsent()) return;
  window.gtag?.("event", action, params);
}

export function consentUpdate(granted: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
}
