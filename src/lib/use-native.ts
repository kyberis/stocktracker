"use client";

import { useState, useEffect } from "react";
import { isNativePlatform, getNativePlatform, persistNativeDetection } from "./capacitor";

/**
 * Returns true when running inside a Capacitor native shell.
 * Safe for SSR — returns false on the server, detects on client after hydration.
 * Retries detection once after a short delay in case the bridge loads late.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) {
      setIsNative(true);
      persistNativeDetection();
      return;
    }
    const timer = setTimeout(() => {
      const detected = isNativePlatform();
      setIsNative(detected);
      if (detected) persistNativeDetection();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return isNative;
}

/**
 * Returns "ios", "android", or "web".
 * Safe for SSR — returns "web" on the server.
 */
export function useNativePlatform(): "ios" | "android" | "web" {
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");

  useEffect(() => {
    const p = getNativePlatform();
    if (p !== "web") {
      setPlatform(p);
      persistNativeDetection();
      return;
    }
    const timer = setTimeout(() => {
      const detected = getNativePlatform();
      setPlatform(detected);
      if (detected !== "web") persistNativeDetection();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return platform;
}
