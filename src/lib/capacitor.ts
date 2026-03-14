/**
 * Detects whether the app is running inside a Capacitor native shell (iOS/Android).
 * Uses multiple strategies: Capacitor bridge object, URL parameter (?native=1),
 * and localStorage flag (set on first successful detection).
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;

  const cap = (window as unknown as Record<string, unknown>).Capacitor as
    | { isNativePlatform?: () => boolean }
    | undefined;
  if (cap?.isNativePlatform?.()) return true;

  try {
    if (typeof URLSearchParams !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("native") === "1") return true;
    }
    if (localStorage.getItem("trefolio-native") === "1") return true;
  } catch { /* ignore */ }

  return false;
}

export function getNativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";

  const cap = (window as unknown as Record<string, unknown>).Capacitor as
    | { getPlatform?: () => string }
    | undefined;
  const platform = cap?.getPlatform?.();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";

  try {
    const stored = localStorage.getItem("trefolio-native-platform");
    if (stored === "ios" || stored === "android") return stored;
  } catch { /* ignore */ }

  if (isNativePlatform()) {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
  }

  return "web";
}

/**
 * Returns the client platform type for the feature registry.
 * "mobile" when running inside a Capacitor native shell, "desktop" otherwise.
 */
export function getClientPlatform(): "desktop" | "mobile" {
  return isNativePlatform() ? "mobile" : "desktop";
}

/** Persist native detection so subsequent navigations keep the native UI */
export function persistNativeDetection(): void {
  if (typeof window === "undefined") return;
  try {
    const platform = getNativePlatform();
    if (platform !== "web") {
      localStorage.setItem("trefolio-native", "1");
      localStorage.setItem("trefolio-native-platform", platform);
    }
  } catch { /* ignore */ }
}
