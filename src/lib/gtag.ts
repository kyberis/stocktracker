let _gaId = "";
let _adsId = "";

export function getGaId(): string {
  return _gaId;
}

export function setGaId(id: string) {
  _gaId = id;
}

export function getAdsId(): string {
  return _adsId;
}

export function setAdsId(id: string) {
  _adsId = id;
}

export const CONSENT_KEY = "trefolio_cookie_consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "all";
}

function hasAnyId(): boolean {
  return !!_gaId || !!_adsId;
}

export function pageview(url: string) {
  if (!hasAnyId() || !hasAnalyticsConsent()) return;
  if (_gaId) window.gtag?.("config", _gaId, { page_path: url });
  if (_adsId) window.gtag?.("config", _adsId);
}

export function event(
  action: string,
  params?: Record<string, string>,
) {
  if (!hasAnyId() || !hasAnalyticsConsent()) return;
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
