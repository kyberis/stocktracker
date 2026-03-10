"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/gtag";

export default function AdSenseScript({ clientId = "" }: { clientId?: string }) {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setHasConsent(localStorage.getItem(CONSENT_KEY) === "all");

    function onConsent(e: Event) {
      setHasConsent((e as CustomEvent<string>).detail === "all");
    }
    function onStorage(e: StorageEvent) {
      if (e.key === CONSENT_KEY) setHasConsent(e.newValue === "all");
    }
    window.addEventListener("trefolio-consent", onConsent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("trefolio-consent", onConsent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!clientId || !hasConsent) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
