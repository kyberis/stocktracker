"use client";

import { useState, useEffect } from "react";
import {
  isNativePlatform,
  getNativePlatform,
  persistNativeDetection,
  clearStaleNativeFlags,
} from "./capacitor";

/**
 * Returns true when running inside a Capacitor native shell.
 * Safe for SSR — returns false on the server, detects on client after hydration.
 * Retries detection once after a short delay in case the bridge loads late.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const run = (): void => {
      if (cancelled) return;
      clearStaleNativeFlags();
      if (isNativePlatform()) {
        setIsNative(true);
        persistNativeDetection();
        return;
      }
      settleTimer = setTimeout(() => {
        if (cancelled) return;
        const detected = isNativePlatform();
        setIsNative(detected);
        if (detected) persistNativeDetection();
      }, 150);
    };

    const raf = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
    };
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
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const run = (): void => {
      if (cancelled) return;
      const p = getNativePlatform();
      if (p !== "web") {
        setPlatform(p);
        persistNativeDetection();
        return;
      }
      settleTimer = setTimeout(() => {
        if (cancelled) return;
        const detected = getNativePlatform();
        setPlatform(detected);
        if (detected !== "web") persistNativeDetection();
      }, 150);
    };

    const raf = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
    };
  }, []);

  return platform;
}
