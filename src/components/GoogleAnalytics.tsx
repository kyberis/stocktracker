"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_MEASUREMENT_ID, CONSENT_KEY, pageview, consentUpdate } from "@/lib/gtag";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      pageview(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

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
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

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
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });
          `,
        }}
      />
    </>
  );
}
