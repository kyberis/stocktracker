/**
 * Normalizes sister-app base URLs for server-side fetch.
 * Vercel returns 308 when http:// is used against production hosts; treating
 * that as failure breaks Office coordination. Local dev keeps http://localhost.
 */
export function normalizeSisterAppBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("http://")) {
    return trimmed.replace(/^http:\/\//, "https://");
  }
  return trimmed;
}

/** True when a redirect response targets session login, not HTTPS upgrade. */
export function isLoginAuthRedirect(status: number, location: string | null): boolean {
  if (status < 300 || status >= 400) return false;
  if (!location) return false;
  try {
    const path = new URL(location, "https://placeholder.invalid").pathname;
    return path === "/login" || path.startsWith("/login/");
  } catch {
    return /\/login(?:\/|$)/.test(location);
  }
}
