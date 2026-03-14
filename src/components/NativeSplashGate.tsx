"use client";

import { useEffect } from "react";
import { hideNativeSplash } from "@/lib/native-splash";

/**
 * Hides the native splash screen shortly after the page paints.
 * Place in the root layout so every page triggers it.
 * MobileDashboard may call hideNativeSplash() earlier once data is ready;
 * the call is idempotent so duplicates are harmless.
 */
export default function NativeSplashGate() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => hideNativeSplash(), 300);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
