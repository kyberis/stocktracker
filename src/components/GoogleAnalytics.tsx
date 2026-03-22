"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getGaId, setGaId, getAdsId, setAdsId, CONSENT_KEY, pageview, consentUpdate } from "@/lib/gtag";

export default function GoogleAnalytics({ gaId = "", googleAdsId = "" }: { gaId?: string; googleAdsId?: string }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (gaId) setGaId(gaId);
  }, [gaId]);

  useEffect(() => {
    if (googleAdsId) setAdsId(googleAdsId);
  }, [googleAdsId]);

  useEffect(() => {
    if (!getGaId() && !getAdsId()) return;
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      pageview(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    if (!getGaId() && !getAdsId()) return;

    if (localStorage.getItem(CONSENT_KEY) === "all") {
      consentUpdate(true);
    }

    function onStorage(e: StorageEvent) {
      if (e.key === CONSENT_KEY) {
        consentUpdate(e.newValue === "all");
      }
    }

    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      consentUpdate(detail === "all");
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("trefolio-consent", onConsentChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("trefolio-consent", onConsentChange);
    };
  }, [gaId, googleAdsId]);

  const hasAnyId = gaId || googleAdsId;
  if (!hasAnyId) return null;

  const adsConfigLine = googleAdsId ? `\n            gtag('config', '${googleAdsId}');` : "";

  return (
    <>
      <Script
        id="ga-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            });
          `,
        }}
      />

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId || googleAdsId}`}
        strategy="afterInteractive"
      />

      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());${gaId ? `
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });` : ""}${adsConfigLine}
          `,
        }}
      />
    </>
  );
}
