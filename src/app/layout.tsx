import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cookies } from "next/headers";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AdSenseScript from "@/components/AdSenseScript";
import ServiceWorkerUpdater from "@/components/ServiceWorkerUpdater";
import NativeSplashGate from "@/components/NativeSplashGate";
import { getGaMeasurementId, getAdConfig } from "@/lib/db";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#10b981",
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const adConfig = await getAdConfig();

  return {
    metadataBase: new URL("https://trefolio.com"),
    title: "trefolio - Portfolio Manager",
    description:
      "trefolio is the portfolio tracker for European investors. EU tax reports, stock screener, net worth tracking, broker sync, AI analysis in 35 languages, and dividend projections. Free to start.",
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: {
        ...(process.env.BING_SITE_VERIFICATION
          ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
          : {}),
        ...(adConfig.clientId
          ? { "google-adsense-account": adConfig.clientId }
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
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gaId, adConfig] = await Promise.all([getGaMeasurementId(), getAdConfig()]);
  const adsClientId = adConfig.globalEnabled ? adConfig.clientId : "";

  const cookieStore = cookies();
  const layoutCookie = cookieStore.get("trefolio_layout_theme")?.value;
  const validThemes = new Set(["terminal", "canvas", "studio"]);
  const initialThemeClass = layoutCookie && validThemes.has(layoutCookie) ? `theme-${layoutCookie}` : "";
  const initialDarkClass = layoutCookie === "terminal" || layoutCookie === "studio" ? "dark" : "";
  const htmlClass = [initialThemeClass, initialDarkClass].filter(Boolean).join(" ");

  return (
    <html lang="en" className={htmlClass || undefined}>
      <head>
        {/* Apply dark class from cookie before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )trefolio_layout_theme=([^;]*)/);if(m){var t=decodeURIComponent(m[1]);if(t==="terminal"||t==="studio")document.documentElement.classList.add("dark");if(t==="canvas")document.documentElement.classList.remove("dark")}else{var s=localStorage.getItem("trefolio-theme");if(s==="dark")document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
        {layoutCookie && validThemes.has(layoutCookie) && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
              href={
                layoutCookie === "terminal"
                  ? "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
                  : layoutCookie === "canvas"
                    ? "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
                    : "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
              }
              rel="stylesheet"
            />
          </>
        )}
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
        <NativeSplashGate />
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
