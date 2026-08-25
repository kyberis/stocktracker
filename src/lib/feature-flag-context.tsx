"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 300_000;

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoaded: boolean;
  refreshFlags: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  isLoaded: false,
  refreshFlags: () => {},
});

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFlags = useCallback(() => {
    fetch("/api/feature-flags", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setFlags(data);
        setIsLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFlags();

    intervalRef.current = setInterval(fetchFlags, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchFlags();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchFlags]);

  return (
    <FeatureFlagContext.Provider value={{ flags, isLoaded, refreshFlags: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(flag: string): boolean {
  const { flags } = useContext(FeatureFlagContext);
  return flags[flag] ?? false;
}

export function useFeatureFlags(): Record<string, boolean> {
  return useContext(FeatureFlagContext).flags;
}

export function useFeatureFlagContext(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext);
}
