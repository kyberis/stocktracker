import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AdSenseScript from "@/components/AdSenseScript";
import ServiceWorkerUpdater from "@/components/ServiceWorkerUpdater";
import { getGaMeasurementId, getAdConfig } from "@/lib/db";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://trefolio.com"),
  title: "trefolio - Portfolio Manager",
  description:
    "trefolio is a portfolio tracker for European investors. Real-time quotes, broker imports (DEGIRO, IBKR, T212, Revolut), AI analysis, and dividend projections. Free to start.",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "trefolio",
  },
  openGraph: {
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gaId, adConfig] = await Promise.all([getGaMeasurementId(), getAdConfig()]);
  const adsClientId = adConfig.globalEnabled ? adConfig.clientId : "";

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
        <CookieConsent />
        <GoogleAnalytics gaId={gaId} />
        <AdSenseScript clientId={adsClientId} />
        <Analytics />
        <SpeedInsights />
        <ServiceWorkerUpdater />
      </body>
    </html>
  );
}
