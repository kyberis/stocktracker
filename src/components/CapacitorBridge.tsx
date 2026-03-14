"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { isNativePlatform, getNativePlatform, persistNativeDetection } from "@/lib/capacitor";
import { startSplashFallback } from "@/lib/native-splash";

// Eagerly register the Capacitor bridge so the native shell can call
// window.Capacitor.triggerEvent as soon as the JS bundle loads.
if (typeof window !== "undefined" && Capacitor) {
  try { persistNativeDetection(); } catch { /* ignore */ }
}

/**
 * Bridges native Capacitor features into the web app:
 * - Manages native splash screen (hidden once web content is ready)
 * - Android hardware back button → browser history navigation
 * - Status bar configuration on app resume
 */
export default function CapacitorBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    startSplashFallback();

    let cleanup: (() => void) | undefined;

    async function init() {
      const platform = getNativePlatform();

      try {
        const { App } = await import("@capacitor/app");

        const backListener = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.minimizeApp();
          }
        });

        if (platform === "android" || platform === "ios") {
          try {
            const { StatusBar, Style } = await import("@capacitor/status-bar");
            await StatusBar.setStyle({ style: Style.Dark });
            if (platform === "android") {
              await StatusBar.setBackgroundColor({ color: "#0f172a" });
            }
          } catch {
            // StatusBar plugin may not be available in all contexts
          }
        }

        cleanup = () => {
          backListener.remove();
        };
      } catch {
        // Capacitor plugins not available (e.g. running in browser)
      }
    }

    init();
    return () => cleanup?.();
  }, []);

  return null;
}
