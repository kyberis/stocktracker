"use client";

import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 640px)";

/**
 * Returns true when the viewport is at or below the Tailwind `sm` breakpoint (640px).
 * SSR-safe — returns false on the server, detects on the client, and updates on resize.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);

    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
