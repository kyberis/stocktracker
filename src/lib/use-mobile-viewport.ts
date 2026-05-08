"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 640px)";

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns true when the viewport is at or below the Tailwind `sm` breakpoint (640px).
 * SSR-safe — returns false on the server, detects on the client, and updates on resize.
 */
export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
