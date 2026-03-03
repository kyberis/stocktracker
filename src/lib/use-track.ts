"use client";

import { useCallback } from "react";

type TrackFn = (event: string, metadata?: Record<string, string>) => void;

export function useTrack(): TrackFn {
  return useCallback((event: string, metadata?: Record<string, string>) => {
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
    }).catch(() => {});
  }, []);
}
