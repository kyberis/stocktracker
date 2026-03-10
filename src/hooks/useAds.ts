"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CONSENT_KEY } from "@/lib/gtag";

export function useAds(): { showAds: boolean } {
  const { user, isLoading } = useAuth();
  const [hasConsent, setHasConsent] = useState(false);

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

  if (isLoading) return { showAds: false };

  const plan = user?.plan ?? "free";
  const isFree = plan === "free";

  return { showAds: isFree && hasConsent };
}
