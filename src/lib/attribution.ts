export const FIRST_TOUCH_ATTRIBUTION_KEY = "trefolio_first_touch_utm";
export const FIRST_TOUCH_ATTRIBUTION_COOKIE = "trefolio_first_touch_utm";

export interface FirstTouchAttribution {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  landingPath: string;
  referrer: string;
  capturedAt: string;
}

type PartialAttribution = Partial<FirstTouchAttribution>;

function sanitize(value: string | undefined, maxLen: number): string {
  if (!value) return "";
  return value.trim().slice(0, maxLen);
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeAttribution(input?: PartialAttribution): FirstTouchAttribution {
  const source = sanitize(input?.source, 64).toLowerCase();
  const medium = sanitize(input?.medium, 64).toLowerCase();
  const campaign = sanitize(input?.campaign, 128);
  const term = sanitize(input?.term, 128);
  const content = sanitize(input?.content, 128);
  const landingPath = sanitize(input?.landingPath, 256);
  const referrer = sanitize(input?.referrer, 512);
  const capturedAt = sanitize(input?.capturedAt, 64) || new Date().toISOString();

  return {
    source: source || "unknown",
    medium: medium || "unknown",
    campaign,
    term,
    content,
    landingPath,
    referrer,
    capturedAt,
  };
}

function writeAttributionCookie(value: FirstTouchAttribution): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(value));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${FIRST_TOUCH_ATTRIBUTION_COOKIE}=${encoded}; Path=/; Max-Age=7776000; SameSite=Lax${secure}`;
}

function parseStoredValue(raw: string | null | undefined): FirstTouchAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PartialAttribution;
    return normalizeAttribution(parsed);
  } catch {
    return null;
  }
}

export function getStoredFirstTouchAttribution(): FirstTouchAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = parseStoredValue(window.localStorage.getItem(FIRST_TOUCH_ATTRIBUTION_KEY));
    if (fromLocal) return fromLocal;
    const fromSession = parseStoredValue(window.sessionStorage.getItem(FIRST_TOUCH_ATTRIBUTION_KEY));
    return fromSession;
  } catch {
    return null;
  }
}

function persistFirstTouchAttribution(value: FirstTouchAttribution): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(value);
  try {
    window.localStorage.setItem(FIRST_TOUCH_ATTRIBUTION_KEY, serialized);
    window.sessionStorage.setItem(FIRST_TOUCH_ATTRIBUTION_KEY, serialized);
  } catch {
    // Ignore storage errors in private browsing.
  }
  writeAttributionCookie(value);
}

function resolveSourceFromReferrer(referrer: string): { source: string; medium: string } {
  if (!referrer) return { source: "direct", medium: "none" };
  const refHost = hostFromUrl(referrer);
  const ownHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  if (!refHost || (ownHost && refHost === ownHost)) return { source: "direct", medium: "none" };
  return { source: refHost, medium: "referral" };
}

function shouldKeepExisting(existing: FirstTouchAttribution | null): boolean {
  if (!existing) return false;
  return existing.source !== "unknown" && existing.source !== "direct";
}

export function captureFirstTouchAttributionFromWindow(): FirstTouchAttribution | null {
  if (typeof window === "undefined") return null;

  const existing = getStoredFirstTouchAttribution();
  if (shouldKeepExisting(existing)) return existing;

  const params = new URLSearchParams(window.location.search);
  const utmSource = sanitize(params.get("utm_source") || undefined, 64);
  const utmMedium = sanitize(params.get("utm_medium") || undefined, 64);
  const utmCampaign = sanitize(params.get("utm_campaign") || undefined, 128);
  const utmTerm = sanitize(params.get("utm_term") || undefined, 128);
  const utmContent = sanitize(params.get("utm_content") || undefined, 128);

  const hasUtm = !!(utmSource || utmMedium || utmCampaign || utmTerm || utmContent);
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const fallback = resolveSourceFromReferrer(referrer);

  const attribution = normalizeAttribution({
    source: hasUtm ? utmSource : fallback.source,
    medium: hasUtm ? (utmMedium || "utm") : fallback.medium,
    campaign: utmCampaign,
    term: utmTerm,
    content: utmContent,
    landingPath: window.location.pathname,
    referrer,
    capturedAt: new Date().toISOString(),
  });

  persistFirstTouchAttribution(attribution);
  return attribution;
}

export function parseFirstTouchAttributionCookie(cookieValue?: string): FirstTouchAttribution | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded) as PartialAttribution;
    return normalizeAttribution(parsed);
  } catch {
    return null;
  }
}
