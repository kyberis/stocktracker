"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { CONSENT_KEY } from "@/lib/gtag";

interface AdConfigPublic {
  enabled: boolean;
  clientId?: string;
  slots?: Record<string, string>;
}

let cachedConfig: AdConfigPublic | null = null;
let fetchPromise: Promise<AdConfigPublic> | null = null;

function fetchConfig(): Promise<AdConfigPublic> {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/ad-config")
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((c: AdConfigPublic) => {
      cachedConfig = c;
      fetchPromise = null;
      return c;
    })
    .catch(() => {
      fetchPromise = null;
      return { enabled: false } as AdConfigPublic;
    });
  return fetchPromise;
}

export function invalidateAdConfigCache() {
  cachedConfig = null;
  fetchPromise = null;
}

export function useAds(): {
  showAds: boolean;
  clientId: string;
  slotEnabled: (slotKey: string) => boolean;
  slotId: (slotKey: string) => string;
} {
  const { user, isLoading } = useAuth();
  const [hasConsent, setHasConsent] = useState(false);
  const [config, setConfig] = useState<AdConfigPublic | null>(cachedConfig);

  useEffect(() => {
    setHasConsent(localStorage.getItem(CONSENT_KEY) === "all");

    function onStorage(e: StorageEvent) {
      if (e.key === CONSENT_KEY) setHasConsent(e.newValue === "all");
    }
    function onConsent(e: Event) {
      setHasConsent((e as CustomEvent<string>).detail === "all");
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("trefolio-consent", onConsent);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("trefolio-consent", onConsent);
    };
  }, []);

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  const plan = user?.plan ?? "free";
  const isFree = plan === "free";
  const showAds = !isLoading && isFree && hasConsent && !!config?.enabled && !!config.clientId;

  const slotEnabled = useCallback(
    (slotKey: string) => showAds && !!config?.slots?.[slotKey],
    [showAds, config],
  );

  const slotIdFn = useCallback(
    (slotKey: string) => config?.slots?.[slotKey] ?? "",
    [config],
  );

  return {
    showAds,
    clientId: config?.clientId ?? "",
    slotEnabled,
    slotId: slotIdFn,
  };
}
