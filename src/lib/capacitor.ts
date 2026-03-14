/**
 * Detects whether the app is running inside a Capacitor native shell (iOS/Android).
 * Capacitor injects a global `Capacitor` object when the web app loads inside a native WebView.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor as
    | { isNativePlatform?: () => boolean }
    | undefined;
  return cap?.isNativePlatform?.() ?? false;
}

export function getNativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as Record<string, unknown>).Capacitor as
    | { getPlatform?: () => string }
    | undefined;
  const platform = cap?.getPlatform?.();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}

/**
 * Returns the client platform type for the feature registry.
 * "mobile" when running inside a Capacitor native shell, "desktop" otherwise.
 */
export function getClientPlatform(): "desktop" | "mobile" {
  return isNativePlatform() ? "mobile" : "desktop";
}
