import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Demo — trefolio",
  description:
    "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
  alternates: { canonical: "https://trefolio.com/demo" },
  openGraph: {
    title: "Interactive Demo — trefolio",
    description:
      "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
    url: "https://trefolio.com/demo",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/dashboard-overview.png",
        width: 1280,
        height: 800,
        alt: "trefolio demo portfolio dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Demo — trefolio",
    description:
      "Try trefolio with a sample portfolio. No signup required. See the dashboard, performance metrics, dividends, and AI analysis in action.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
