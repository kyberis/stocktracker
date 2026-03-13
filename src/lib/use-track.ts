"use client";

import { useCallback } from "react";
import { event as gtagEvent } from "@/lib/gtag";

type TrackFn = (event: string, metadata?: Record<string, string>) => void;

/**
 * Client-side analytics — sends events to Google Analytics only.
 * Server-side events (signup, login, billing) use trackEvent() in the DB directly.
 */
export function useTrack(): TrackFn {
  return useCallback((event: string, metadata?: Record<string, string>) => {
    gtagEvent(event, metadata);
  }, []);
}
