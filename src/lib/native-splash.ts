let hidden = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Hide the native splash screen. Safe to call multiple times —
 * only the first call has an effect. A 10-second fallback ensures
 * the splash always disappears even if the app never signals readiness.
 */
export async function hideNativeSplash(): Promise<void> {
  if (hidden) return;
  hidden = true;
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch { /* plugin not available */ }
}

/**
 * Start the fallback timer. Call once on app mount so the splash
 * hides after 10 s even if data never finishes loading.
 */
export function startSplashFallback(): void {
  if (hidden || fallbackTimer) return;
  fallbackTimer = setTimeout(() => { hideNativeSplash(); }, 10_000);
}
